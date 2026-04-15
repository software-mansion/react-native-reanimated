#include <jsi/jsi.h>
#include <react/renderer/uimanager/UIManagerBinding.h>
#include <react/renderer/uimanager/primitives.h>
#include <worklets/Compat/Holders.h>
#include <worklets/Compat/StableApi.h>
#include <worklets/NativeModules/JSIWorkletsModuleProxy.h>
#include <worklets/NativeModules/WorkletsModuleProxy.h>
#include <worklets/SharedItems/Serializable.h>
#include <worklets/SharedItems/SerializableFactory.h>
#include <worklets/SharedItems/Shareable.h>
#include <worklets/SharedItems/Synchronizable.h>
#include <worklets/Tools/Defs.h>
#include <worklets/Tools/FeatureFlags.h>
#include <worklets/Tools/JSLogger.h>
#include <worklets/Tools/WorkletsJSIUtils.h>
#include <worklets/Tools/WorkletsSystraceSection.h>
#include <worklets/WorkletRuntime/BundleModeConfig.h>
#include <worklets/WorkletRuntime/UIRuntimeDecorator.h>

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

inline jsi::Value
runOnUISync(const std::weak_ptr<WorkletRuntime> &weakUIWorkletRuntime, jsi::Runtime &rt, const jsi::Value &worklet) {
  if (auto uiWorkletRuntime = weakUIWorkletRuntime.lock()) {
    auto serializableWorklet = extractSerializableOrThrow<SerializableWorklet>(
        rt, worklet, "[Worklets] Only worklets can be executed on UI runtime.");
    auto serializedResult = uiWorkletRuntime->runSyncSerialized(serializableWorklet);
    return serializedResult->toJSValue(rt);
  }
  return jsi::Value::undefined();
}

jsi::Value
runOnRuntimeSync(jsi::Runtime &rt, const jsi::Value &workletRuntimeValue, const jsi::Value &serializableWorkletValue) {
  auto workletRuntime = workletRuntimeValue.getObject(rt).getHostObject<WorkletRuntime>(rt);
  auto worklet = extractSerializableOrThrow<SerializableWorklet>(
      rt, serializableWorkletValue, "[Worklets] Only worklets can be executed on a worklet runtime.");
  return workletRuntime->runSyncSerialized(worklet)->toJSValue(rt);
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

inline jsi::Value propagateModuleUpdate(
    const std::shared_ptr<RuntimeManager> &runtimeManager,
    const std::string &code,
    const std::string &sourceUrl) {
  const auto runtimes = runtimeManager->getAllRuntimes();

  for (const auto &runtime : runtimes) {
    runtime->runSync([code, sourceUrl](jsi::Runtime &rt) -> void {
      const auto buffer = std::make_shared<jsi::StringBuffer>(code);
      rt.evaluateJavaScript(buffer, sourceUrl);
    });
  }
  return jsi::Value::undefined();
}

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
    const std::shared_ptr<MessageQueueThread> &jsQueue,
    const std::shared_ptr<JSScheduler> &jsScheduler,
    const std::shared_ptr<UIScheduler> &uiScheduler,
    const std::shared_ptr<MemoryManager> &memoryManager,
    const std::shared_ptr<RuntimeManager> &runtimeManager,
    const std::weak_ptr<WorkletRuntime> &uiWorkletRuntime,
    const std::shared_ptr<RuntimeBindings> &runtimeBindings,
    const BundleModeConfig &bundleModeConfig,
    const std::shared_ptr<UnpackerLoader> &unpackerLoader)
    : isDevBundle_(isDevBundle),
      bundleModeConfig_(bundleModeConfig),
      jsQueue_(jsQueue),
      jsScheduler_(jsScheduler),
      uiScheduler_(uiScheduler),
      memoryManager_(memoryManager),
      runtimeManager_(runtimeManager),
      uiWorkletRuntime_(uiWorkletRuntime),
      runtimeBindings_(runtimeBindings),
      unpackerLoader_(unpackerLoader) {}

jsi::Object JSIWorkletsModuleProxy::toOptimizedObject(jsi::Runtime &rt) const {
  auto obj = jsi::Object(rt);
  using jsi_utils::BoundedArgs;

  jsi_utils::addMethod<15>(
      rt,
      obj,
      "loadUnpackers",
      [unpackerLoader = unpackerLoader_](jsi::Runtime &rt, const jsi::Value &, BoundedArgs<15> args, size_t) {
        const auto valueUnpackerCode = args.get<0>().asString(rt).utf8(rt);
        const auto valueUnpackerLocation = args.get<1>().asString(rt).utf8(rt);
        const auto valueUnpackerSourceMap = args.get<2>().asString(rt).utf8(rt);

        const auto synchronizableUnpackerCode = args.get<3>().asString(rt).utf8(rt);
        const auto synchronizableUnpackerLocation = args.get<4>().asString(rt).utf8(rt);
        const auto synchronizableUnpackerSourceMap = args.get<5>().asString(rt).utf8(rt);

        const auto customSerializableUnpackerCode = args.get<6>().asString(rt).utf8(rt);
        const auto customSerializableUnpackerLocation = args.get<7>().asString(rt).utf8(rt);
        const auto customSerializableUnpackerSourceMap = args.get<8>().asString(rt).utf8(rt);

        const auto shareableHostUnpackerCode = args.get<9>().asString(rt).utf8(rt);
        const auto shareableHostUnpackerLocation = args.get<10>().asString(rt).utf8(rt);
        const auto shareableHostUnpackerSourceMap = args.get<11>().asString(rt).utf8(rt);

        const auto shareableGuestUnpackerCode = args.get<12>().asString(rt).utf8(rt);
        const auto shareableGuestUnpackerLocation = args.get<13>().asString(rt).utf8(rt);
        const auto shareableGuestUnpackerSourceMap = args.get<14>().asString(rt).utf8(rt);

        unpackerLoader->loadUnpackers(ShareableUnpackers{
            .valueUnpacker =
                {.code = valueUnpackerCode, .location = valueUnpackerLocation, .sourceMap = valueUnpackerSourceMap},
            .synchronizableUnpacker =
                {.code = synchronizableUnpackerCode,
                 .location = synchronizableUnpackerLocation,
                 .sourceMap = synchronizableUnpackerSourceMap},
            .customSerializableUnpacker =
                {.code = customSerializableUnpackerCode,
                 .location = customSerializableUnpackerLocation,
                 .sourceMap = customSerializableUnpackerSourceMap},
            .shareableHostUnpacker =
                {.code = shareableHostUnpackerCode,
                 .location = shareableHostUnpackerLocation,
                 .sourceMap = shareableHostUnpackerSourceMap},
            .shareableGuestUnpacker =
                {.code = shareableGuestUnpackerCode,
                 .location = shareableGuestUnpackerLocation,
                 .sourceMap = shareableGuestUnpackerSourceMap},
        });
        return jsi::Value::undefined();
      });

  jsi_utils::addMethod<3>(
      rt, obj, "createSerializable", [](jsi::Runtime &rt, const jsi::Value &, BoundedArgs<3> args, size_t) {
        return makeSerializableClone(rt, args.get<0>(), args.get<1>(), args.get<2>());
      });

  jsi_utils::addMethod<1>(
      rt, obj, "createSerializableBigInt", [](jsi::Runtime &rt, const jsi::Value &, BoundedArgs<1> args, size_t) {
        return makeSerializableBigInt(rt, args.get<0>().asBigInt(rt));
      });

  jsi_utils::addMethod<1>(
      rt, obj, "createSerializableBoolean", [](jsi::Runtime &rt, const jsi::Value &, BoundedArgs<1> args, size_t) {
        return makeSerializableBoolean(rt, args.get<0>().asBool());
      });

  jsi_utils::addMethod<2>(
      rt, obj, "createSerializableImport", [](jsi::Runtime &rt, const jsi::Value &, BoundedArgs<2> args, size_t) {
        return makeSerializableImport(rt, args.get<0>().asNumber(), args.get<1>().asString(rt));
      });

  jsi_utils::addMethod<0>(
      rt, obj, "createSerializableNull", [](jsi::Runtime &rt, const jsi::Value &, BoundedArgs<0> args, size_t) {
        return makeSerializableNull(rt);
      });

  jsi_utils::addMethod<1>(
      rt, obj, "createSerializableNumber", [](jsi::Runtime &rt, const jsi::Value &, BoundedArgs<1> args, size_t) {
        return makeSerializableNumber(rt, args.get<0>().asNumber());
      });

  jsi_utils::addMethod<1>(
      rt, obj, "createSerializableString", [](jsi::Runtime &rt, const jsi::Value &, BoundedArgs<1> args, size_t) {
        return makeSerializableString(rt, args.get<0>().asString(rt));
      });

  jsi_utils::addMethod<0>(
      rt, obj, "createSerializableUndefined", [](jsi::Runtime &rt, const jsi::Value &, BoundedArgs<0> args, size_t) {
        return makeSerializableUndefined(rt);
      });

  jsi_utils::addMethod<1>(
      rt, obj, "createSerializableHostObject", [](jsi::Runtime &rt, const jsi::Value &, BoundedArgs<1> args, size_t) {
        return makeSerializableHostObject(rt, args.get<0>().asObject(rt).asHostObject(rt));
      });

  jsi_utils::addMethod<1>(
      rt, obj, "createSerializableInitializer", [](jsi::Runtime &rt, const jsi::Value &, BoundedArgs<1> args, size_t) {
        return makeSerializableInitializer(rt, args.get<0>().asObject(rt));
      });

  jsi_utils::addMethod<2>(
      rt, obj, "createSerializableArray", [](jsi::Runtime &rt, const jsi::Value &, BoundedArgs<2> args, size_t) {
        return makeSerializableArray(rt, args.get<0>().asObject(rt).asArray(rt), args.get<1>());
      });

  jsi_utils::addMethod<1>(
      rt, obj, "createSerializableFunction", [](jsi::Runtime &rt, const jsi::Value &, BoundedArgs<1> args, size_t) {
        return makeSerializableFunction(rt, args.get<0>().asObject(rt).asFunction(rt));
      });

  jsi_utils::addMethod<2>(
      rt,
      obj,
      "createSerializableTurboModuleLike",
      [](jsi::Runtime &rt, const jsi::Value &, BoundedArgs<2> args, size_t) {
        return makeSerializableTurboModuleLike(
            rt, args.get<0>().asObject(rt), args.get<1>().asObject(rt).asHostObject(rt));
      });

  jsi_utils::addMethod<3>(
      rt, obj, "createSerializableObject", [](jsi::Runtime &rt, const jsi::Value &, BoundedArgs<3> args, size_t count) {
        if (count < 2) {
          throw jsi::JSError(rt, "[Worklets] createSerializableObject expects at least 2 arguments.");
        }

        const auto shouldPersistRemote = args.get<1>().getBool();
        const auto remoteValue = count > 2 ? jsi::Value(rt, args.get<2>()) : jsi::Value::undefined();
        return makeSerializableObject(rt, args.get<0>().getObject(rt), shouldPersistRemote, remoteValue);
      });

  jsi_utils::addMethod<2>(
      rt, obj, "createSerializableMap", [](jsi::Runtime &rt, const jsi::Value &, BoundedArgs<2> args, size_t) {
        return makeSerializableMap(rt, args.get<0>().asObject(rt).asArray(rt), args.get<1>().asObject(rt).asArray(rt));
      });

  jsi_utils::addMethod<1>(
      rt, obj, "createSerializableSet", [](jsi::Runtime &rt, const jsi::Value &, BoundedArgs<1> args, size_t) {
        return makeSerializableSet(rt, args.get<0>().asObject(rt).asArray(rt));
      });

  jsi_utils::addMethod<2>(
      rt, obj, "createSerializableWorklet", [](jsi::Runtime &rt, const jsi::Value &, BoundedArgs<2> args, size_t) {
        return makeSerializableWorklet(rt, args.get<0>().getObject(rt), args.get<1>().getBool());
      });

  jsi_utils::addMethod<2>(
      rt, obj, "createCustomSerializable", [](jsi::Runtime &rt, const jsi::Value &, BoundedArgs<2> args, size_t) {
        return makeCustomSerializable(rt, args.get<0>(), args.get<1>().asNumber());
      });

  jsi_utils::addMethod<4>(
      rt,
      obj,
      "registerCustomSerializable",
      [memoryManager = memoryManager_, runtimeManager = runtimeManager_](
          jsi::Runtime &rt, const jsi::Value &, BoundedArgs<4> args, size_t) {
        const auto determine = extractSerializableOrThrow<SerializableWorklet>(
            rt, args.get<0>(), "[Worklets] Determine function must be a worklet.");
        const auto pack = extractSerializableOrThrow<SerializableWorklet>(
            rt, args.get<1>(), "[Worklets] Pack function must be a worklet.");
        const auto unpack = extractSerializableOrThrow<SerializableWorklet>(
            rt, args.get<2>(), "[Worklets] Unpack function must be a worklet.");
        const auto typeId = args.get<3>().asNumber();
        registerCustomSerializable(runtimeManager, memoryManager, determine, pack, unpack, typeId);
        return jsi::Value::undefined();
      });

  jsi_utils::addMethod<1>(
      rt,
      obj,
      "scheduleOnUI",
      [uiScheduler = uiScheduler_, uiWorkletRuntime = uiWorkletRuntime_](
          jsi::Runtime &rt, const jsi::Value &, BoundedArgs<1> args, size_t) {
        scheduleOnUI(uiScheduler, uiWorkletRuntime, rt, args.get<0>());
        return jsi::Value::undefined();
      });

  jsi_utils::addMethod<1>(
      rt,
      obj,
      "runOnUISync",
      [uiWorkletRuntime = uiWorkletRuntime_](jsi::Runtime &rt, const jsi::Value &, BoundedArgs<1> args, size_t) {
        return runOnUISync(uiWorkletRuntime, rt, args.get<0>());
      });

  jsi_utils::addMethod<2>(
      rt, obj, "runOnRuntimeSync", [](jsi::Runtime &rt, const jsi::Value &, BoundedArgs<2> args, size_t) {
        return runOnRuntimeSync(rt, args.get<0>(), args.get<1>());
      });

  jsi_utils::addMethod<2>(
      rt,
      obj,
      "runOnRuntimeSyncWithId",
      [runtimeManager = runtimeManager_](jsi::Runtime &rt, const jsi::Value &, BoundedArgs<2> args, size_t) {
        const int runtimeId = args.get<0>().asNumber();
        const auto workletRuntime = runtimeManager->getRuntime(runtimeId);
        if (!workletRuntime) {
          throw jsi::JSError(
              rt, "[Worklets] runOnRuntimeSyncWithId: no worklet runtime found for id " + std::to_string(runtimeId));
        }
        auto serializableWorklet = extractSerializableOrThrow<SerializableWorklet>(
            rt, args.get<1>(), "[Worklets] Only worklets can be executed on a worklet runtime.");
        return workletRuntime->runSyncSerialized(serializableWorklet)->toJSValue(rt);
      });

  jsi_utils::addMethod<5>(
      rt,
      obj,
      "createWorkletRuntime",
      [clone = std::make_shared<JSIWorkletsModuleProxy>(*this)](
          jsi::Runtime &rt, const jsi::Value &, BoundedArgs<5> args, size_t) {
        const auto name = args.get<0>().asString(rt).utf8(rt);
        auto serializableInitializer = extractSerializableOrThrow<SerializableWorklet>(
            rt, args.get<1>(), "[Worklets] Initializer must be a worklet.");
        const auto useDefaultQueue = args.get<2>().asBool();

        std::shared_ptr<AsyncQueue> asyncQueue;
        if (useDefaultQueue) {
          asyncQueue = std::make_shared<AsyncQueueImpl>(name + "_queue");
        } else {
          asyncQueue = extractAsyncQueue(rt, args.get<3>());
        }

        const auto enableEventLoop = args.get<4>().asBool();

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

  jsi_utils::addMethod<2>(
      rt, obj, "scheduleOnRuntime", [](jsi::Runtime &rt, const jsi::Value &, BoundedArgs<2> args, size_t) {
        worklets::scheduleOnRuntime(rt, args.get<0>(), args.get<1>());
        return jsi::Value::undefined();
      });

  jsi_utils::addMethod<2>(
      rt,
      obj,
      "scheduleOnRuntimeWithId",
      [runtimeManager = runtimeManager_](jsi::Runtime &rt, const jsi::Value &, BoundedArgs<2> args, size_t) {
        const int runtimeId = args.get<0>().asNumber();
        const auto workletRuntime = runtimeManager->getRuntime(runtimeId);
        if (!workletRuntime) {
          throw jsi::JSError(
              rt, "[Worklets] scheduleOnRuntimeWithId: no worklet runtime found for id " + std::to_string(runtimeId));
        }
        const auto worklet = extractSerializableOrThrow<SerializableWorklet>(
            rt, args.get<1>(), "[Worklets] Only worklets can be scheduled to run on a worklet runtime.");
        workletRuntime->schedule(worklet);
        return jsi::Value::undefined();
      });

  jsi_utils::addMethod<4>(
      rt,
      obj,
      "reportFatalErrorOnJS",
      [jsScheduler = jsScheduler_](jsi::Runtime &rt, const jsi::Value &, BoundedArgs<4> args, size_t) {
        return reportFatalErrorOnJS(
            jsScheduler,
            /* message */ args.get<0>().asString(rt).utf8(rt),
            /* stack */ args.get<1>().asString(rt).utf8(rt),
            /* name */ args.get<2>().asString(rt).utf8(rt),
            /* jsEngine */ args.get<3>().asString(rt).utf8(rt));
      });

  jsi_utils::addMethod<1>(
      rt, obj, "getStaticFeatureFlag", [](jsi::Runtime &rt, const jsi::Value &, BoundedArgs<1> args, size_t) {
        return worklets::StaticFeatureFlags::getFlag(/* name */ args.get<0>().asString(rt).utf8(rt));
      });

  jsi_utils::addMethod<2>(
      rt, obj, "setDynamicFeatureFlag", [](jsi::Runtime &rt, const jsi::Value &, BoundedArgs<2> args, size_t) {
        worklets::DynamicFeatureFlags::setFlag(
            /* name */ args.get<0>().asString(rt).utf8(rt),
            /* value */ args.get<1>().asBool());
        return jsi::Value::undefined();
      });

  jsi_utils::addMethod<1>(
      rt, obj, "createSynchronizable", [](jsi::Runtime &rt, const jsi::Value &, BoundedArgs<1> args, size_t) {
        auto initial = extractSerializableOrThrow(rt, args.get<0>(), "[Worklets] Value must be a Serializable.");
        auto synchronizable = std::make_shared<Synchronizable>(initial);
        return SerializableJSRef::newNativeStateObject(rt, synchronizable);
      });

  jsi_utils::addMethod<1>(
      rt, obj, "synchronizableGetDirty", [](jsi::Runtime &rt, const jsi::Value &, BoundedArgs<1> args, size_t) {
        auto synchronizable = extractSynchronizableOrThrow(rt, args.get<0>());
        return synchronizable->getDirty()->toJSValue(rt);
      });

  jsi_utils::addMethod<1>(
      rt, obj, "synchronizableGetBlocking", [](jsi::Runtime &rt, const jsi::Value &, BoundedArgs<1> args, size_t) {
        auto synchronizable = extractSynchronizableOrThrow(rt, args.get<0>());
        return synchronizable->getBlocking()->toJSValue(rt);
      });

  jsi_utils::addMethod<2>(
      rt, obj, "synchronizableSetBlocking", [](jsi::Runtime &rt, const jsi::Value &, BoundedArgs<2> args, size_t) {
        auto synchronizable = extractSynchronizableOrThrow(rt, args.get<0>());
        auto newValue = extractSerializableOrThrow(rt, args.get<1>(), "[Worklets] Value must be a Serializable.");
        synchronizable->setBlocking(newValue);
        return jsi::Value::undefined();
      });

  jsi_utils::addMethod<1>(
      rt, obj, "synchronizableLock", [](jsi::Runtime &rt, const jsi::Value &, BoundedArgs<1> args, size_t) {
        auto synchronizable = extractSynchronizableOrThrow(rt, args.get<0>());
        synchronizable->lock();
        return jsi::Value::undefined();
      });

  jsi_utils::addMethod<1>(
      rt, obj, "synchronizableUnlock", [](jsi::Runtime &rt, const jsi::Value &, BoundedArgs<1> args, size_t) {
        auto synchronizable = extractSynchronizableOrThrow(rt, args.get<0>());
        synchronizable->unlock();
        return jsi::Value::undefined();
      });

  jsi_utils::addMethod<5>(
      rt,
      obj,
      "createShareable",
      [runtimeManager = runtimeManager_](
          jsi::Runtime &rt, const jsi::Value &, BoundedArgs<5> args, size_t) -> jsi::Value {
        const int hostRuntimeId = args.get<0>().asNumber();
        const auto hostRuntime = runtimeManager->getRuntime(hostRuntimeId);
        if (!hostRuntime) {
          throw jsi::JSError(
              rt, "[Worklets] createShareable: no worklet runtime found for id " + std::to_string(hostRuntimeId));
        }
        const auto initial = extractSerializableOrThrow(rt, args.get<1>(), "[Worklets] Value must be a Serializable.");
        const auto initSynchronously = args.get<2>().asBool();
        const auto decorateHost = extractSerializableOrThrow(rt, args.get<3>());
        const auto decorateGuest = extractSerializableOrThrow(rt, args.get<4>());
        const auto shareable =
            std::make_shared<Shareable>(hostRuntime, initial, initSynchronously, decorateHost, decorateGuest);
        return SerializableJSRef::newNativeStateObject(rt, shareable);
      });

  jsi_utils::addMethod<2>(
      rt,
      obj,
      "propagateModuleUpdate",
      [runtimeManager = runtimeManager_](jsi::Runtime &rt, const jsi::Value &, BoundedArgs<2> args, size_t) {
        return propagateModuleUpdate(
            runtimeManager,
            /* code */ args.get<0>().asString(rt).utf8(rt),
            /* sourceURL */ args.get<1>().asString(rt).utf8(rt));
      });

  jsi_utils::addMethod<0>(
      rt,
      obj,
      "getUIRuntimeHolder",
      [uiWorkletRuntime = uiWorkletRuntime_](jsi::Runtime &rt, const jsi::Value &, BoundedArgs<0> args, size_t) {
        const auto strongUIWorkletRuntime = uiWorkletRuntime.lock();
        if (!strongUIWorkletRuntime) {
          throw jsi::JSError(rt, "[Worklets] UI Worklet Runtime is not available.");
        }
        auto nativeState = std::make_shared<WorkletRuntimeHolder>(strongUIWorkletRuntime);
        auto obj = jsi::Object(rt);
        obj.setNativeState(rt, std::move(nativeState));
        return jsi::Value(std::move(obj));
      });

  jsi_utils::addMethod<0>(
      rt,
      obj,
      "getUISchedulerHolder",
      [uiScheduler = uiScheduler_](jsi::Runtime &rt, const jsi::Value &, BoundedArgs<0> args, size_t) {
        auto nativeState = std::make_shared<UISchedulerHolder>(uiScheduler);
        auto obj = jsi::Object(rt);
        obj.setNativeState(rt, std::move(nativeState));
        return jsi::Value(std::move(obj));
      });

  return obj;
}

} // namespace worklets
