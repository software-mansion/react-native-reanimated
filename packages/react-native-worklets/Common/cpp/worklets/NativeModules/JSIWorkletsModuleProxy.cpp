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
    const std::shared_ptr<JSIWorkletsModuleProxy> &jsiWorkletsModuleProxy,
    const std::string &name,
    std::shared_ptr<SerializableWorklet> &initializer,
    const std::shared_ptr<AsyncQueue> &queue,
    bool enableEventLoop) {
  const auto workletRuntime = runtimeManager->createWorkletRuntime(jsiWorkletsModuleProxy, name, initializer, queue);
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
  using jsi_utils::at;

  jsi_utils::addMethod<15>(
      rt,
      obj,
      "loadUnpackers",
      [unpackerLoader = unpackerLoader_](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[15]) {
        const auto valueUnpackerCode = at<0>(args).asString(rt).utf8(rt);
        const auto valueUnpackerLocation = at<1>(args).asString(rt).utf8(rt);
        const auto valueUnpackerSourceMap = at<2>(args).asString(rt).utf8(rt);

        const auto synchronizableUnpackerCode = at<3>(args).asString(rt).utf8(rt);
        const auto synchronizableUnpackerLocation = at<4>(args).asString(rt).utf8(rt);
        const auto synchronizableUnpackerSourceMap = at<5>(args).asString(rt).utf8(rt);

        const auto customSerializableUnpackerCode = at<6>(args).asString(rt).utf8(rt);
        const auto customSerializableUnpackerLocation = at<7>(args).asString(rt).utf8(rt);
        const auto customSerializableUnpackerSourceMap = at<8>(args).asString(rt).utf8(rt);

        const auto shareableHostUnpackerCode = at<9>(args).asString(rt).utf8(rt);
        const auto shareableHostUnpackerLocation = at<10>(args).asString(rt).utf8(rt);
        const auto shareableHostUnpackerSourceMap = at<11>(args).asString(rt).utf8(rt);

        const auto shareableGuestUnpackerCode = at<12>(args).asString(rt).utf8(rt);
        const auto shareableGuestUnpackerLocation = at<13>(args).asString(rt).utf8(rt);
        const auto shareableGuestUnpackerSourceMap = at<14>(args).asString(rt).utf8(rt);

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
      });

  jsi_utils::addMethod<3>(
      rt, obj, "createSerializable", [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[3]) {
        return makeSerializableClone(rt, at<0>(args), at<1>(args), at<2>(args));
      });

  jsi_utils::addMethod<1>(
      rt, obj, "createSerializableBigInt", [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[1]) {
        return makeSerializableBigInt(rt, at<0>(args).asBigInt(rt));
      });

  jsi_utils::addMethod<1>(
      rt, obj, "createSerializableBoolean", [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[1]) {
        return makeSerializableBoolean(rt, at<0>(args).asBool());
      });

  jsi_utils::addMethod<2>(
      rt, obj, "createSerializableImport", [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[2]) {
        return makeSerializableImport(rt, at<0>(args).asNumber(), at<1>(args).asString(rt));
      });

  jsi_utils::addMethod<0>(
      rt, obj, "createSerializableNull", [](jsi::Runtime &rt, const jsi::Value &) { return makeSerializableNull(rt); });

  jsi_utils::addMethod<1>(
      rt, obj, "createSerializableNumber", [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[1]) {
        return makeSerializableNumber(rt, at<0>(args).asNumber());
      });

  jsi_utils::addMethod<1>(
      rt, obj, "createSerializableString", [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[1]) {
        return makeSerializableString(rt, at<0>(args).asString(rt));
      });

  jsi_utils::addMethod<0>(rt, obj, "createSerializableUndefined", [](jsi::Runtime &rt, const jsi::Value &) {
    return makeSerializableUndefined(rt);
  });

  jsi_utils::addMethod<1>(
      rt, obj, "createSerializableHostObject", [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[1]) {
        return makeSerializableHostObject(rt, at<0>(args).asObject(rt).asHostObject(rt));
      });

  jsi_utils::addMethod<1>(
      rt, obj, "createSerializableInitializer", [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[1]) {
        return makeSerializableInitializer(rt, at<0>(args).asObject(rt));
      });

  jsi_utils::addMethod<2>(
      rt, obj, "createSerializableArray", [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[2]) {
        return makeSerializableArray(rt, at<0>(args).asObject(rt).asArray(rt), at<1>(args));
      });

  jsi_utils::addMethod<1>(
      rt, obj, "createSerializableFunction", [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[1]) {
        return makeSerializableFunction(rt, at<0>(args).asObject(rt).asFunction(rt));
      });

  jsi_utils::addMethod<2>(
      rt,
      obj,
      "createSerializableTurboModuleLike",
      [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[2]) {
        return makeSerializableTurboModuleLike(rt, at<0>(args).asObject(rt), at<1>(args).asObject(rt).asHostObject(rt));
      });

  jsi_utils::addMethod<3>(
      rt, obj, "createSerializableObject", [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[3]) {
        return makeSerializableObject(rt, at<0>(args).getObject(rt), at<1>(args).getBool(), at<2>(args));
      });

  jsi_utils::addMethod<2>(
      rt, obj, "createSerializableMap", [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[2]) {
        return makeSerializableMap(rt, at<0>(args).asObject(rt).asArray(rt), at<1>(args).asObject(rt).asArray(rt));
      });

  jsi_utils::addMethod<1>(
      rt, obj, "createSerializableSet", [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[1]) {
        return makeSerializableSet(rt, at<0>(args).asObject(rt).asArray(rt));
      });

  jsi_utils::addMethod<2>(
      rt, obj, "createSerializableWorklet", [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[2]) {
        return makeSerializableWorklet(rt, at<0>(args).getObject(rt), at<1>(args).getBool());
      });

  jsi_utils::addMethod<2>(
      rt, obj, "createCustomSerializable", [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[2]) {
        return makeCustomSerializable(rt, at<0>(args), at<1>(args).asNumber());
      });

  jsi_utils::addMethod<4>(
      rt,
      obj,
      "registerCustomSerializable",
      [memoryManager = memoryManager_, runtimeManager = runtimeManager_](
          jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[4]) {
        const auto determine = extractSerializableOrThrow<SerializableWorklet>(
            rt, at<0>(args), "[Worklets] Determine function must be a worklet.");
        const auto pack = extractSerializableOrThrow<SerializableWorklet>(
            rt, at<1>(args), "[Worklets] Pack function must be a worklet.");
        const auto unpack = extractSerializableOrThrow<SerializableWorklet>(
            rt, at<2>(args), "[Worklets] Unpack function must be a worklet.");
        const auto typeId = at<3>(args).asNumber();
        registerCustomSerializable(runtimeManager, memoryManager, determine, pack, unpack, typeId);
      });

  jsi_utils::addMethod<1>(
      rt,
      obj,
      "scheduleOnUI",
      [uiScheduler = uiScheduler_, uiWorkletRuntime = uiWorkletRuntime_](
          jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[1]) {
        scheduleOnUI(uiScheduler, uiWorkletRuntime, rt, at<0>(args));
      });

  jsi_utils::addMethod<1>(
      rt,
      obj,
      "runOnUISync",
      [uiWorkletRuntime = uiWorkletRuntime_](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[1]) {
        return runOnUISync(uiWorkletRuntime, rt, at<0>(args));
      });

  jsi_utils::addMethod<2>(
      rt, obj, "runOnRuntimeSync", [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[2]) {
        return runOnRuntimeSync(rt, at<0>(args), at<1>(args));
      });

  jsi_utils::addMethod<2>(
      rt,
      obj,
      "runOnRuntimeSyncWithId",
      [runtimeManager = runtimeManager_](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[2]) {
        const int runtimeId = at<0>(args).asNumber();
        const auto workletRuntime = runtimeManager->getRuntime(runtimeId);
        if (!workletRuntime) {
          throw jsi::JSError(
              rt, "[Worklets] runOnRuntimeSyncWithId: no worklet runtime found for id " + std::to_string(runtimeId));
        }
        auto serializableWorklet = extractSerializableOrThrow<SerializableWorklet>(
            rt, at<1>(args), "[Worklets] Only worklets can be executed on a worklet runtime.");
        return workletRuntime->runSyncSerialized(serializableWorklet)->toJSValue(rt);
      });

  jsi_utils::addMethod<5>(
      rt,
      obj,
      "createWorkletRuntime",
      [clone = std::make_shared<JSIWorkletsModuleProxy>(*this)](
          jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[5]) {
        const auto name = at<0>(args).asString(rt).utf8(rt);
        auto serializableInitializer = extractSerializableOrThrow<SerializableWorklet>(
            rt, at<1>(args), "[Worklets] Initializer must be a worklet.");
        const auto useDefaultQueue = at<2>(args).asBool();

        std::shared_ptr<AsyncQueue> asyncQueue;
        if (useDefaultQueue) {
          asyncQueue = std::make_shared<AsyncQueueImpl>(name + "_queue");
        } else {
          asyncQueue = extractAsyncQueue(rt, at<3>(args));
        }

        const auto enableEventLoop = at<4>(args).asBool();

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
      rt, obj, "scheduleOnRuntime", [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[2]) {
        worklets::scheduleOnRuntime(rt, at<0>(args), at<1>(args));
      });

  jsi_utils::addMethod<2>(
      rt,
      obj,
      "scheduleOnRuntimeWithId",
      [runtimeManager = runtimeManager_](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[2]) {
        const int runtimeId = at<0>(args).asNumber();
        const auto workletRuntime = runtimeManager->getRuntime(runtimeId);
        if (!workletRuntime) {
          throw jsi::JSError(
              rt, "[Worklets] scheduleOnRuntimeWithId: no worklet runtime found for id " + std::to_string(runtimeId));
        }
        const auto worklet = extractSerializableOrThrow<SerializableWorklet>(
            rt, at<1>(args), "[Worklets] Only worklets can be scheduled to run on a worklet runtime.");
        workletRuntime->schedule(worklet);
      });

  jsi_utils::addMethod<4>(
      rt,
      obj,
      "reportFatalErrorOnJS",
      [jsScheduler = jsScheduler_](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[4]) {
        return reportFatalErrorOnJS(
            jsScheduler,
            /* message */ at<0>(args).asString(rt).utf8(rt),
            /* stack */ at<1>(args).asString(rt).utf8(rt),
            /* name */ at<2>(args).asString(rt).utf8(rt),
            /* jsEngine */ at<3>(args).asString(rt).utf8(rt));
      });

  jsi_utils::addMethod<1>(
      rt, obj, "getStaticFeatureFlag", [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[1]) {
        return worklets::StaticFeatureFlags::getFlag(/* name */ at<0>(args).asString(rt).utf8(rt));
      });

  jsi_utils::addMethod<2>(
      rt, obj, "setDynamicFeatureFlag", [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[2]) {
        worklets::DynamicFeatureFlags::setFlag(
            /* name */ at<0>(args).asString(rt).utf8(rt),
            /* value */ at<1>(args).asBool());
      });

  jsi_utils::addMethod<1>(
      rt, obj, "createSynchronizable", [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[1]) {
        auto initial = extractSerializableOrThrow(rt, at<0>(args), "[Worklets] Value must be a Serializable.");
        auto synchronizable = std::make_shared<Synchronizable>(initial);
        return SerializableJSRef::newNativeStateObject(rt, synchronizable);
      });

  jsi_utils::addMethod<1>(
      rt, obj, "synchronizableGetDirty", [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[1]) {
        auto synchronizable = extractSynchronizableOrThrow(rt, at<0>(args));
        return synchronizable->getDirty()->toJSValue(rt);
      });

  jsi_utils::addMethod<1>(
      rt, obj, "synchronizableGetBlocking", [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[1]) {
        auto synchronizable = extractSynchronizableOrThrow(rt, at<0>(args));
        return synchronizable->getBlocking()->toJSValue(rt);
      });

  jsi_utils::addMethod<2>(
      rt, obj, "synchronizableSetBlocking", [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[2]) {
        auto synchronizable = extractSynchronizableOrThrow(rt, at<0>(args));
        auto newValue = extractSerializableOrThrow(rt, at<1>(args), "[Worklets] Value must be a Serializable.");
        synchronizable->setBlocking(newValue);
      });

  jsi_utils::addMethod<1>(
      rt, obj, "synchronizableLock", [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[1]) {
        auto synchronizable = extractSynchronizableOrThrow(rt, at<0>(args));
        synchronizable->lock();
      });

  jsi_utils::addMethod<1>(
      rt, obj, "synchronizableUnlock", [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[1]) {
        auto synchronizable = extractSynchronizableOrThrow(rt, at<0>(args));
        synchronizable->unlock();
      });

  jsi_utils::addMethod<5>(
      rt,
      obj,
      "createShareable",
      [runtimeManager = runtimeManager_](
          jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[5]) -> jsi::Value {
        const int hostRuntimeId = at<0>(args).asNumber();
        const auto hostRuntime = runtimeManager->getRuntime(hostRuntimeId);
        if (!hostRuntime) {
          throw jsi::JSError(
              rt, "[Worklets] createShareable: no worklet runtime found for id " + std::to_string(hostRuntimeId));
        }
        const auto initial = extractSerializableOrThrow(rt, at<1>(args), "[Worklets] Value must be a Serializable.");
        const auto initSynchronously = at<2>(args).asBool();
        const auto decorateHost = extractSerializableOrThrow(rt, at<3>(args));
        const auto decorateGuest = extractSerializableOrThrow(rt, at<4>(args));
        const auto shareable =
            std::make_shared<Shareable>(hostRuntime, initial, initSynchronously, decorateHost, decorateGuest);
        return SerializableJSRef::newNativeStateObject(rt, shareable);
      });

  jsi_utils::addMethod<2>(
      rt,
      obj,
      "propagateModuleUpdate",
      [runtimeManager = runtimeManager_](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[2]) {
        return propagateModuleUpdate(
            runtimeManager,
            /* code */ at<0>(args).asString(rt).utf8(rt),
            /* sourceURL */ at<1>(args).asString(rt).utf8(rt));
      });

  jsi_utils::addMethod<0>(
      rt, obj, "getUIRuntimeHolder", [uiWorkletRuntime = uiWorkletRuntime_](jsi::Runtime &rt, const jsi::Value &) {
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
      rt, obj, "getUISchedulerHolder", [uiScheduler = uiScheduler_](jsi::Runtime &rt, const jsi::Value &) {
        auto nativeState = std::make_shared<UISchedulerHolder>(uiScheduler);
        auto obj = jsi::Object(rt);
        obj.setNativeState(rt, std::move(nativeState));
        return jsi::Value(std::move(obj));
      });

  return obj;
}

} // namespace worklets
