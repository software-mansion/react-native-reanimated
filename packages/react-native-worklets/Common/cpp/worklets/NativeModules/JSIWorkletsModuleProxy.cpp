#include <react/renderer/uimanager/UIManagerBinding.h>
#include <react/renderer/uimanager/primitives.h>

#include <worklets/NativeModules/JSIWorkletsModuleProxy.h>
#include <worklets/NativeModules/WorkletsModuleProxy.h>
#include <worklets/SharedItems/Serializable.h>
#include <worklets/SharedItems/Synchronizable.h>
#include <worklets/Tools/Defs.h>
#include <worklets/Tools/FeatureFlags.h>
#include <worklets/Tools/JSLogger.h>
#include <worklets/WorkletRuntime/UIRuntimeDecorator.h>

#ifdef __ANDROID__
#include <fbjni/fbjni.h>
#endif // __ANDROID__

#include <memory>
#include <string>
#include <utility>
#include <vector>

using namespace facebook;

namespace worklets {

inline void scheduleOnUI(
    const std::shared_ptr<UIScheduler> &uiScheduler,
    const std::weak_ptr<WorkletRuntime> &weakUIWorkletRuntime,
    jsi::Runtime &rt,
    const jsi::Value &worklet) {
  auto serializableWorklet = extractSerializableOrThrow<SerializableWorklet>(
      rt, worklet, "[Worklets] Only worklets can be scheduled to run on UI.");
  uiScheduler->scheduleOnUI([serializableWorklet, weakUIWorkletRuntime]() {
    // This callback can outlive the WorkletsModuleProxy object during the
    // invalidation of React Native. This happens when WorkletsModuleProxy
    // destructor is called on the JS thread and the UI thread is
    // executing callbacks from the `scheduleOnUI` queue. Therefore, we
    // need to make sure it's still alive before we try to access it.
    auto uiWorkletRuntime = weakUIWorkletRuntime.lock();
    if (!uiWorkletRuntime) {
      return;
    }

#if JS_RUNTIME_HERMES
    // JSI's scope defined here allows for JSI-objects to be cleared up
    // after each runtime loop. Within these loops we typically create
    // some temporary JSI objects and hence it allows for such objects to
    // be garbage collected much sooner. Apparently the scope API is only
    // supported on Hermes at the moment.
    const auto scope = jsi::Scope(uiWorkletRuntime->getJSIRuntime());
#endif // JS_RUNTIME_HERMES

    uiWorkletRuntime->runSync(serializableWorklet);
  });
}

inline jsi::Value executeOnUIRuntimeSync(
    const std::weak_ptr<WorkletRuntime> &weakUIWorkletRuntime,
    jsi::Runtime &rt,
    const jsi::Value &worklet) {
  if (auto uiWorkletRuntime = weakUIWorkletRuntime.lock()) {
    auto serializableWorklet = extractSerializableOrThrow<SerializableWorklet>(
        rt, worklet, "[Worklets] Only worklets can be executed on UI runtime.");
    auto serializedResult = uiWorkletRuntime->runSyncSerialized(serializableWorklet);
    return serializedResult->toJSValue(rt);
  }
  return jsi::Value::undefined();
}

inline jsi::Value createWorkletRuntime(
    jsi::Runtime &originRuntime,
    const std::shared_ptr<RuntimeManager> &runtimeManager,
    const std::shared_ptr<MessageQueueThread> &jsQueue,
    std::shared_ptr<JSIWorkletsModuleProxy> jsiWorkletsModuleProxy,
    const std::string &name,
    std::shared_ptr<SerializableWorklet> &initializer,
    const std::shared_ptr<AsyncQueue> &queue,
    bool enableEventLoop) {
  const auto workletRuntime =
      runtimeManager->createWorkletRuntime(std::move(jsiWorkletsModuleProxy), name, initializer, queue);
  return jsi::Object::createFromHostObject(originRuntime, workletRuntime);
}

#ifdef WORKLETS_BUNDLE_MODE
inline jsi::Value propagateModuleUpdate(
    const std::shared_ptr<RuntimeManager> &runtimeManager,
    const std::string &code,
    const std::string &sourceUrl) {
  const auto runtimes = runtimeManager->getAllRuntimes();

  for (auto runtime : runtimes) {
    runtime->runSync([code, sourceUrl](jsi::Runtime &rt) -> void {
      const auto buffer = std::make_shared<jsi::StringBuffer>(code);
      rt.evaluateJavaScript(buffer, sourceUrl);
    });
  }
  return jsi::Value::undefined();
}
#endif // WORKLETS_BUNDLE_MODE

inline jsi::Value reportFatalErrorOnJS(
    const std::shared_ptr<JSScheduler> &jsScheduler,
    const std::string &message,
    const std::string &stack,
    const std::string &name,
    const std::string &jsEngine) {
  JSLogger::reportFatalErrorOnJS(
      jsScheduler, JSErrorData{.message = message, .stack = stack, .name = name, .jsEngine = jsEngine});
  return jsi::Value::undefined();
}

inline std::shared_ptr<AsyncQueue> extractAsyncQueue(jsi::Runtime &rt, const jsi::Value &value) {
  if (!value.isObject()) {
    return nullptr;
  }
  const auto object = value.asObject(rt);

  if (!object.hasNativeState(rt)) {
    return nullptr;
  }

  const auto &nativeState = object.getNativeState(rt);
  auto asyncQueue = std::dynamic_pointer_cast<AsyncQueue>(nativeState);

  return asyncQueue;
}

inline void registerCustomSerializable(
    const std::shared_ptr<RuntimeManager> &runtimeManager,
    const std::shared_ptr<MemoryManager> &memoryManager,
    const std::shared_ptr<SerializableWorklet> &determine,
    const std::shared_ptr<SerializableWorklet> &pack,
    const std::shared_ptr<SerializableWorklet> &unpack,
    const int typeId) {
  const SerializationData data{.determine = determine, .pack = pack, .unpack = unpack, .typeId = typeId};
  // Prevent registering new worklet runtimes while we are updating existing ones to prevent inconsistencies.
  runtimeManager->pause();

  memoryManager->registerCustomSerializable(data);
  for (const auto &runtime : runtimeManager->getAllRuntimes()) {
    memoryManager->loadCustomSerializable(runtime, data);
  }

  runtimeManager->resume();
}

JSIWorkletsModuleProxy::JSIWorkletsModuleProxy(
    const bool isDevBundle,
    const std::shared_ptr<const JSBigStringBuffer> &script,
    const std::string &sourceUrl,
    const std::shared_ptr<MessageQueueThread> &jsQueue,
    const std::shared_ptr<JSScheduler> &jsScheduler,
    const std::shared_ptr<UIScheduler> &uiScheduler,
    const std::shared_ptr<MemoryManager> &memoryManager,
    const std::shared_ptr<RuntimeManager> &runtimeManager,
    const std::weak_ptr<WorkletRuntime> &uiWorkletRuntime)
    : jsi::HostObject(),
      isDevBundle_(isDevBundle),
      script_(script),
      sourceUrl_(sourceUrl),
      jsQueue_(jsQueue),
      jsScheduler_(jsScheduler),
      uiScheduler_(uiScheduler),
      memoryManager_(memoryManager),
      runtimeManager_(runtimeManager),
      uiWorkletRuntime_(uiWorkletRuntime) {}

JSIWorkletsModuleProxy::JSIWorkletsModuleProxy(const JSIWorkletsModuleProxy &other)
    : jsi::HostObject(),
      isDevBundle_(other.isDevBundle_),
      script_(other.script_),
      sourceUrl_(other.sourceUrl_),
      jsQueue_(other.jsQueue_),
      jsScheduler_(other.jsScheduler_),
      uiScheduler_(other.uiScheduler_),
      memoryManager_(other.memoryManager_),
      runtimeManager_(other.runtimeManager_),
      uiWorkletRuntime_(other.uiWorkletRuntime_) {}

JSIWorkletsModuleProxy::~JSIWorkletsModuleProxy() = default;

std::vector<jsi::PropNameID> JSIWorkletsModuleProxy::getPropertyNames(jsi::Runtime &rt) {
  std::vector<jsi::PropNameID> propertyNames;

  propertyNames.emplace_back(jsi::PropNameID::forAscii(rt, "createSerializable"));
  propertyNames.emplace_back(jsi::PropNameID::forAscii(rt, "createSerializableBigInt"));
  propertyNames.emplace_back(jsi::PropNameID::forAscii(rt, "createSerializableBoolean"));
  propertyNames.emplace_back(jsi::PropNameID::forAscii(rt, "createSerializableImport"));
  propertyNames.emplace_back(jsi::PropNameID::forAscii(rt, "createSerializableNull"));
  propertyNames.emplace_back(jsi::PropNameID::forAscii(rt, "createSerializableNumber"));
  propertyNames.emplace_back(jsi::PropNameID::forAscii(rt, "createSerializableString"));
  propertyNames.emplace_back(jsi::PropNameID::forAscii(rt, "createSerializableUndefined"));
  propertyNames.emplace_back(jsi::PropNameID::forAscii(rt, "createSerializableHostObject"));
  propertyNames.emplace_back(jsi::PropNameID::forAscii(rt, "createSerializableInitializer"));
  propertyNames.emplace_back(jsi::PropNameID::forAscii(rt, "createSerializableArray"));
  propertyNames.emplace_back(jsi::PropNameID::forAscii(rt, "createSerializableFunction"));
  propertyNames.emplace_back(jsi::PropNameID::forAscii(rt, "createSerializableTurboModuleLike"));
  propertyNames.emplace_back(jsi::PropNameID::forAscii(rt, "createSerializableObject"));
  propertyNames.emplace_back(jsi::PropNameID::forAscii(rt, "createSerializableMap"));
  propertyNames.emplace_back(jsi::PropNameID::forAscii(rt, "createSerializableSet"));
  propertyNames.emplace_back(jsi::PropNameID::forAscii(rt, "createSerializableWorklet"));
  propertyNames.emplace_back(jsi::PropNameID::forAscii(rt, "createCustomSerializable"));
  propertyNames.emplace_back(jsi::PropNameID::forAscii(rt, "registerCustomSerializable"));

  propertyNames.emplace_back(jsi::PropNameID::forAscii(rt, "scheduleOnUI"));
  propertyNames.emplace_back(jsi::PropNameID::forAscii(rt, "executeOnUIRuntimeSync"));
  propertyNames.emplace_back(jsi::PropNameID::forAscii(rt, "createWorkletRuntime"));
  propertyNames.emplace_back(jsi::PropNameID::forAscii(rt, "scheduleOnRuntime"));
  propertyNames.emplace_back(jsi::PropNameID::forAscii(rt, "reportFatalErrorOnJS"));

  propertyNames.emplace_back(jsi::PropNameID::forAscii(rt, "getStaticFeatureFlag"));
  propertyNames.emplace_back(jsi::PropNameID::forAscii(rt, "setDynamicFeatureFlag"));

  propertyNames.emplace_back(jsi::PropNameID::forAscii(rt, "createSynchronizable"));
  propertyNames.emplace_back(jsi::PropNameID::forAscii(rt, "synchronizableGetDirty"));
  propertyNames.emplace_back(jsi::PropNameID::forAscii(rt, "synchronizableGetBlocking"));
  propertyNames.emplace_back(jsi::PropNameID::forAscii(rt, "synchronizableSetBlocking"));
  propertyNames.emplace_back(jsi::PropNameID::forAscii(rt, "synchronizableLock"));
  propertyNames.emplace_back(jsi::PropNameID::forAscii(rt, "synchronizableUnlock"));

#ifdef WORKLETS_BUNDLE_MODE
  propertyNames.emplace_back(jsi::PropNameID::forAscii(rt, "propagateModuleUpdate"));
#endif // WORKLETS_BUNDLE_MODE

  return propertyNames;
}

jsi::Value JSIWorkletsModuleProxy::get(jsi::Runtime &rt, const jsi::PropNameID &propName) {
  const auto name = propName.utf8(rt);

  if (name == "createSerializable") {
    return jsi::Function::createFromHostFunction(
        rt, propName, 3, [](jsi::Runtime &rt, const jsi::Value &thisValue, const jsi::Value *args, size_t count) {
          return makeSerializableClone(rt, args[0], args[1], args[2]);
        });
  }

  if (name == "createSerializableBigInt") {
    return jsi::Function::createFromHostFunction(
        rt, propName, 1, [](jsi::Runtime &rt, const jsi::Value &thisValue, const jsi::Value *args, size_t count) {
          return makeSerializableBigInt(rt, args[0].asBigInt(rt));
        });
  }

  if (name == "createSerializableBoolean") {
    return jsi::Function::createFromHostFunction(
        rt, propName, 1, [](jsi::Runtime &rt, const jsi::Value &thisValue, const jsi::Value *args, size_t count) {
          return makeSerializableBoolean(rt, args[0].asBool());
        });
  }

  if (name == "createSerializableImport") {
    return jsi::Function::createFromHostFunction(
        rt, propName, 2, [](jsi::Runtime &rt, const jsi::Value &thisValue, const jsi::Value *args, size_t count) {
          return makeSerializableImport(rt, args[0].asNumber(), args[1].asString(rt));
        });
  }

  if (name == "createSerializableNumber") {
    return jsi::Function::createFromHostFunction(
        rt, propName, 1, [](jsi::Runtime &rt, const jsi::Value &thisValue, const jsi::Value *args, size_t count) {
          return makeSerializableNumber(rt, args[0].asNumber());
        });
  }

  if (name == "createSerializableNull") {
    return jsi::Function::createFromHostFunction(
        rt, propName, 0, [](jsi::Runtime &rt, const jsi::Value &thisValue, const jsi::Value *args, size_t count) {
          return makeSerializableNull(rt);
        });
  }

  if (name == "createSerializableString") {
    return jsi::Function::createFromHostFunction(
        rt, propName, 1, [](jsi::Runtime &rt, const jsi::Value &thisValue, const jsi::Value *args, size_t count) {
          return makeSerializableString(rt, args[0].asString(rt));
        });
  }

  if (name == "createSerializableUndefined") {
    return jsi::Function::createFromHostFunction(
        rt, propName, 0, [](jsi::Runtime &rt, const jsi::Value &thisValue, const jsi::Value *args, size_t count) {
          return makeSerializableUndefined(rt);
        });
  }

  if (name == "createSerializableInitializer") {
    return jsi::Function::createFromHostFunction(
        rt, propName, 1, [](jsi::Runtime &rt, const jsi::Value &thisValue, const jsi::Value *args, size_t count) {
          return makeSerializableInitializer(rt, args[0].asObject(rt));
        });
  }

  if (name == "createSerializableArray") {
    return jsi::Function::createFromHostFunction(
        rt, propName, 2, [](jsi::Runtime &rt, const jsi::Value &thisValue, const jsi::Value *args, size_t count) {
          return makeSerializableArray(rt, args[0].asObject(rt).asArray(rt), args[1]);
        });
  }

  if (name == "createSerializableMap") {
    return jsi::Function::createFromHostFunction(
        rt, propName, 2, [](jsi::Runtime &rt, const jsi::Value &thisValue, const jsi::Value *args, size_t count) {
          return makeSerializableMap(rt, args[0].asObject(rt).asArray(rt), args[1].asObject(rt).asArray(rt));
        });
  }

  if (name == "createSerializableSet") {
    return jsi::Function::createFromHostFunction(
        rt, propName, 1, [](jsi::Runtime &rt, const jsi::Value &thisValue, const jsi::Value *args, size_t count) {
          return makeSerializableSet(rt, args[0].asObject(rt).asArray(rt));
        });
  }

  if (name == "createSerializableHostObject") {
    return jsi::Function::createFromHostFunction(
        rt, propName, 1, [](jsi::Runtime &rt, const jsi::Value &thisValue, const jsi::Value *args, size_t count) {
          return makeSerializableHostObject(rt, args[0].asObject(rt).asHostObject(rt));
        });
  }

  if (name == "createSerializableFunction") {
    return jsi::Function::createFromHostFunction(
        rt, propName, 1, [](jsi::Runtime &rt, const jsi::Value &thisValue, const jsi::Value *args, size_t count) {
          return makeSerializableFunction(rt, args[0].asObject(rt).asFunction(rt));
        });
  }

  if (name == "createSerializableTurboModuleLike") {
    return jsi::Function::createFromHostFunction(
        rt, propName, 2, [](jsi::Runtime &rt, const jsi::Value &thisValue, const jsi::Value *args, size_t count) {
          return makeSerializableTurboModuleLike(rt, args[0].asObject(rt), args[1].asObject(rt).asHostObject(rt));
        });
  }

  if (name == "createSerializableObject") {
    return jsi::Function::createFromHostFunction(
        rt, propName, 1, [](jsi::Runtime &rt, const jsi::Value &thisValue, const jsi::Value *args, size_t count) {
          return makeSerializableObject(rt, args[0].getObject(rt), args[1].getBool(), args[2]);
        });
  }

  if (name == "createSerializableWorklet") {
    return jsi::Function::createFromHostFunction(
        rt, propName, 2, [](jsi::Runtime &rt, const jsi::Value &thisValue, const jsi::Value *args, size_t count) {
          return makeSerializableWorklet(rt, args[0].getObject(rt), args[1].getBool());
        });
  }

  if (name == "createCustomSerializable") {
    return jsi::Function::createFromHostFunction(
        rt, propName, 2, [](jsi::Runtime &rt, const jsi::Value &thisValue, const jsi::Value *args, size_t count) {
          return makeCustomSerializable(rt, args[0], args[1].asNumber());
        });
  }

  if (name == "registerCustomSerializable") {
    return jsi::Function::createFromHostFunction(
        rt,
        propName,
        4,
        [memoryManager = memoryManager_, runtimeManager = runtimeManager_](
            jsi::Runtime &rt, const jsi::Value &thisValue, const jsi::Value *args, size_t count) {
          const auto determine = extractSerializableOrThrow<SerializableWorklet>(
              rt, args[0], "[Worklets] Determine function must be a worklet.");
          const auto pack = extractSerializableOrThrow<SerializableWorklet>(
              rt, args[1], "[Worklets] Pack function must be a worklet.");
          const auto unpack = extractSerializableOrThrow<SerializableWorklet>(
              rt, args[2], "[Worklets] Unpack function must be a worklet.");
          const auto typeId = args[3].asNumber();
          registerCustomSerializable(runtimeManager, memoryManager, determine, pack, unpack, typeId);
          return jsi::Value::undefined();
        });
  }

  if (name == "scheduleOnUI") {
    return jsi::Function::createFromHostFunction(
        rt,
        propName,
        1,
        [uiScheduler = uiScheduler_, uiWorkletRuntime = uiWorkletRuntime_](
            jsi::Runtime &rt, const jsi::Value &thisValue, const jsi::Value *args, size_t count) {
          scheduleOnUI(uiScheduler, uiWorkletRuntime, rt, args[0]);
          return jsi::Value::undefined();
        });
  }

  if (name == "executeOnUIRuntimeSync") {
    return jsi::Function::createFromHostFunction(
        rt,
        propName,
        1,
        [uiWorkletRuntime = uiWorkletRuntime_](
            jsi::Runtime &rt, const jsi::Value &thisValue, const jsi::Value *args, size_t count) {
          return executeOnUIRuntimeSync(uiWorkletRuntime, rt, args[0]);
        });
  }

  if (name == "createWorkletRuntime") {
    return jsi::Function::createFromHostFunction(
        rt,
        propName,
        5,
        [clone = std::make_shared<JSIWorkletsModuleProxy>(*this)](
            jsi::Runtime &rt, const jsi::Value &thisValue, const jsi::Value *args, size_t count) {
          const auto name = args[0].asString(rt).utf8(rt);
          auto serializableInitializer =
              extractSerializableOrThrow<SerializableWorklet>(rt, args[1], "[Worklets] Initializer must be a worklet.");
          const auto useDefaultQueue = args[2].asBool();

          std::shared_ptr<AsyncQueue> asyncQueue;
          if (useDefaultQueue) {
            asyncQueue = std::make_shared<AsyncQueueImpl>(name + "_queue");
          } else {
            asyncQueue = extractAsyncQueue(rt, args[3]);
          }

          const auto enableEventLoop = args[4].asBool();

          return createWorkletRuntime(
              rt,
              clone->getRuntimeManager(),
              clone->getJSQueue(),
              clone,
              name,
              serializableInitializer,
              asyncQueue,
              enableEventLoop);
        });
  }

  if (name == "scheduleOnRuntime") {
    return jsi::Function::createFromHostFunction(
        rt, propName, 2, [](jsi::Runtime &rt, const jsi ::Value &thisValue, const jsi::Value *args, size_t count) {
          worklets::scheduleOnRuntime(rt, args[0], args[1]);
          return jsi::Value::undefined();
        });
  }

  if (name == "reportFatalErrorOnJS") {
    return jsi::Function::createFromHostFunction(
        rt,
        propName,
        4,
        [jsScheduler = jsScheduler_](
            jsi::Runtime &rt, const jsi::Value &thisValue, const jsi::Value *args, size_t count) {
          return reportFatalErrorOnJS(
              jsScheduler,
              /* message */ args[0].asString(rt).utf8(rt),
              /* stack */ args[1].asString(rt).utf8(rt),
              /* name */ args[2].asString(rt).utf8(rt),
              /* jsEngine */ args[3].asString(rt).utf8(rt));
        });
  }

  if (name == "createSynchronizable") {
    return jsi::Function::createFromHostFunction(
        rt, propName, 1, [](jsi::Runtime &rt, const jsi::Value &thisValue, const jsi::Value *args, size_t count) {
          auto initial = extractSerializableOrThrow(rt, args[0], "[Worklets] Value must be a Serializable.");
          auto synchronizable = std::make_shared<Synchronizable>(initial);
          return SerializableJSRef::newNativeStateObject(rt, synchronizable);
        });
  }

  if (name == "synchronizableGetDirty") {
    return jsi::Function::createFromHostFunction(
        rt, propName, 1, [](jsi::Runtime &rt, const jsi::Value &thisValue, const jsi::Value *args, size_t count) {
          auto synchronizable = extractSynchronizableOrThrow(rt, args[0]);
          return synchronizable->getDirty()->toJSValue(rt);
        });
  }

  if (name == "synchronizableGetBlocking") {
    return jsi::Function::createFromHostFunction(
        rt, propName, 1, [](jsi::Runtime &rt, const jsi::Value &thisValue, const jsi::Value *args, size_t count) {
          auto synchronizable = extractSynchronizableOrThrow(rt, args[0]);
          return synchronizable->getBlocking()->toJSValue(rt);
        });
  }

  if (name == "synchronizableSetBlocking") {
    return jsi::Function::createFromHostFunction(
        rt, propName, 2, [](jsi::Runtime &rt, const jsi::Value &thisValue, const jsi::Value *args, size_t count) {
          auto synchronizable = extractSynchronizableOrThrow(rt, args[0]);
          auto newValue = extractSerializableOrThrow(rt, args[1], "[Worklets] Value must be a Serializable.");
          synchronizable->setBlocking(newValue);
          return jsi::Value::undefined();
        });
  }

  if (name == "synchronizableLock") {
    return jsi::Function::createFromHostFunction(
        rt, propName, 1, [](jsi::Runtime &rt, const jsi::Value &thisValue, const jsi::Value *args, size_t count) {
          auto synchronizable = extractSynchronizableOrThrow(rt, args[0]);
          synchronizable->lock();
          return jsi::Value::undefined();
        });
  }

  if (name == "synchronizableUnlock") {
    return jsi::Function::createFromHostFunction(
        rt, propName, 1, [](jsi::Runtime &rt, const jsi::Value &thisValue, const jsi::Value *args, size_t count) {
          auto synchronizable = extractSynchronizableOrThrow(rt, args[0]);
          synchronizable->unlock();
          return jsi::Value::undefined();
        });
  }

#ifdef WORKLETS_BUNDLE_MODE
  if (name == "propagateModuleUpdate") {
    return jsi::Function::createFromHostFunction(
        rt,
        propName,
        2,
        [runtimeManager = runtimeManager_](
            jsi::Runtime &rt, const jsi::Value &thisValue, const jsi::Value *args, size_t count) {
          return propagateModuleUpdate(
              runtimeManager,
              /* code */ args[0].asString(rt).utf8(rt),
              /* sourceURL */ args[1].asString(rt).utf8(rt));
        });
  }
#endif // WORKLETS_BUNDLE_MODE

  if (name == "getStaticFeatureFlag") {
    return jsi::Function::createFromHostFunction(
        rt, propName, 2, [](jsi::Runtime &rt, const jsi::Value &thisValue, const jsi::Value *args, size_t count) {
          return worklets::StaticFeatureFlags::getFlag(
              /* name */ args[0].asString(rt).utf8(rt));
        });
  }

  if (name == "setDynamicFeatureFlag") {
    return jsi::Function::createFromHostFunction(
        rt, propName, 2, [](jsi::Runtime &rt, const jsi::Value &thisValue, const jsi::Value *args, size_t count) {
          worklets::DynamicFeatureFlags::setFlag(
              /* name */ args[0].asString(rt).utf8(rt),
              /* value */ args[1].asBool());
          return jsi::Value::undefined();
        });
  }

  return jsi::Value::undefined();
}

} // namespace worklets
