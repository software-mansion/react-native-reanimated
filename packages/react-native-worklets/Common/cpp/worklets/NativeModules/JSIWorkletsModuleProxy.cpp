#include <jsi/jsi.h>
#include <react/debug/react_native_assert.h>
#include <worklets/Compat/Holders.h>
#include <worklets/Compat/StableApi.h>
#include <worklets/NativeModules/JSIWorkletsModuleProxy.h>
#include <worklets/SharedItems/Serializable.h>
#include <worklets/SharedItems/SerializableFactory.h>
#include <worklets/SharedItems/SerializableRemoteFunction.h>
#include <worklets/SharedItems/Shareable.h>
#include <worklets/SharedItems/Synchronizable.h>
#include <worklets/Tools/FeatureFlags.h>
#include <worklets/Tools/JSLogger.h>
#include <worklets/Tools/WorkletsJSIUtils.h>
#include <worklets/WorkletRuntime/BundleModeConfig.h>
#include <worklets/WorkletRuntime/RuntimeData.h>

#ifndef NDEBUG
#include <algorithm>
#endif // NDEBUG
#include <memory>
#include <optional>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

using namespace facebook;

namespace worklets {

namespace {

inline void scheduleOnUI(
    const std::weak_ptr<WorkletRuntime> &weakUIWorkletRuntime,
    jsi::Runtime &rt,
    const jsi::Value &serializableArrayOfWorkletsValue
#ifndef NDEBUG
    ,
    const jsi::Value &scheduleStacksValue
#endif // NDEBUG
) {
  auto serializable = extractSerializableOrThrow(
      rt, serializableArrayOfWorkletsValue, "[Worklets] scheduleOnUI expects a serializable array of worklets.");
  auto serializableArrayOfWorklets = std::static_pointer_cast<SerializableArray>(serializable);

  const auto &workletsList = serializableArrayOfWorklets->getList();
  std::vector<std::shared_ptr<SerializableWorklet>> worklets;
  worklets.reserve(workletsList.size());
  for (const auto &item : workletsList) {
    worklets.push_back(std::static_pointer_cast<SerializableWorklet>(item));
  }

#ifndef NDEBUG
  std::vector<std::optional<std::string>> scheduleStacks(worklets.size());
  if (scheduleStacksValue.isObject()) {
    auto stacksObject = scheduleStacksValue.asObject(rt);
    if (stacksObject.isArray(rt)) {
      auto stacksArray = stacksObject.asArray(rt);
      auto count = std::min<size_t>(stacksArray.size(rt), scheduleStacks.size());
      for (size_t i = 0; i < count; i++) {
        auto stackValue = stacksArray.getValueAtIndex(rt, i);
        if (stackValue.isString()) {
          scheduleStacks[i] = stackValue.asString(rt).utf8(rt);
        }
      }
    }
  }
#endif // NDEBUG

  auto uiWorkletRuntime = weakUIWorkletRuntime.lock();
  if (!uiWorkletRuntime) {
    return;
  }
  uiWorkletRuntime->schedule([worklets = std::move(worklets),
#ifndef NDEBUG
                              scheduleStacks = std::move(scheduleStacks),
#endif // NDEBUG
                              weakUIWorkletRuntime]() {
    // This callback can outlive the WorkletsModuleProxy object during the
    // invalidation of React Native. This happens when WorkletsModuleProxy
    // destructor is called on the JS thread and the UI thread is
    // executing callbacks from the `scheduleOnUI` queue. Therefore, we
    // need to make sure it's still alive before we try to access it.
    auto uiWorkletRuntime = weakUIWorkletRuntime.lock();
    if (!uiWorkletRuntime) {
      return;
    }

    // JSI's scope defined here allows for JSI-objects to be cleared up
    // after each runtime loop. Within these loops we typically create
    // some temporary JSI objects and hence it allows for such objects to
    // be garbage collected much sooner.
    const auto scope = jsi::Scope(uiWorkletRuntime->getJSIRuntime());

    for (size_t i = 0; i < worklets.size(); i++) {
#ifndef NDEBUG
      uiWorkletRuntime->runSyncWithStack(worklets[i], scheduleStacks[i]);
#else
      uiWorkletRuntime->runSync(worklets[i]);
#endif // NDEBUG
    }

    uiWorkletRuntime->callMicrotasks();
  });
}

#ifndef NDEBUG
inline jsi::Value runOnUISync(
    const std::weak_ptr<WorkletRuntime> &weakUIWorkletRuntime,
    jsi::Runtime &rt,
    const jsi::Value &worklet,
    const std::optional<std::string> &scheduleStack) {
  if (auto uiWorkletRuntime = weakUIWorkletRuntime.lock()) {
    auto serializableWorklet = extractSerializableOrThrow<SerializableWorklet>(
        rt, worklet, "[Worklets] Only worklets can be executed on UI runtime.");
    auto serializedResult = uiWorkletRuntime->runSyncSerializedWithStack(serializableWorklet, scheduleStack);
    return serializedResult->toJSValue(rt);
  }
  return jsi::Value::undefined();
}
#else
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
#endif // NDEBUG

#ifndef NDEBUG
jsi::Value runOnRuntimeSync(
    jsi::Runtime &rt,
    const jsi::Value &workletRuntimeValue,
    const jsi::Value &serializableWorkletValue,
    const std::optional<std::string> &scheduleStack) {
  auto workletRuntime = workletRuntimeValue.getObject(rt).getHostObject<WorkletRuntime>(rt);
  auto worklet = extractSerializableOrThrow<SerializableWorklet>(
      rt, serializableWorkletValue, "[Worklets] Only worklets can be executed on a worklet runtime.");
  return workletRuntime->runSyncSerializedWithStack(worklet, scheduleStack)->toJSValue(rt);
}
#else
jsi::Value
runOnRuntimeSync(jsi::Runtime &rt, const jsi::Value &workletRuntimeValue, const jsi::Value &serializableWorkletValue) {
  auto workletRuntime = workletRuntimeValue.getObject(rt).getHostObject<WorkletRuntime>(rt);
  auto worklet = extractSerializableOrThrow<SerializableWorklet>(
      rt, serializableWorkletValue, "[Worklets] Only worklets can be executed on a worklet runtime.");
  return workletRuntime->runSyncSerialized(worklet)->toJSValue(rt);
}
#endif // NDEBUG

inline jsi::Value createWorkletRuntime(
    jsi::Runtime &originRuntime,
    const std::shared_ptr<RuntimeManager> &runtimeManager,
    const std::shared_ptr<const JSIWorkletsModuleProxy> &sourceProxy,
    const std::string &name,
    std::shared_ptr<SerializableWorklet> &initializer,
    const std::shared_ptr<AsyncQueue> &queue,
    bool enableEventLoop) {
  const auto workletRuntime = runtimeManager->createWorkletRuntime(sourceProxy, name, initializer, queue);
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
    const std::string &name) {
  JSLogger::reportFatalErrorOnJS(jsScheduler, JSErrorData{.message = message, .stack = stack, .name = name});
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
  runtimeManager->withRegistrationPaused([&] {
    memoryManager->registerCustomSerializable(data);
    for (const auto &runtime : runtimeManager->getAllRuntimes()) {
      memoryManager->loadCustomSerializable(runtime, data);
    }
  });
}

} // namespace

jsi::Object JSIWorkletsModuleProxy::toOptimizedObject(jsi::Runtime &rt) const {
  auto obj = jsi::Object(rt);
  using jsi_utils::at;

  jsi_utils::addMethod<18>(
      rt,
      obj,
      "loadUnpackers",
      [unpackerLoader = unpackerLoader_](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[18]) {
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

        const auto remoteFunctionUnpackerCode = args[15].asString(rt).utf8(rt);
        const auto remoteFunctionUnpackerLocation = args[16].asString(rt).utf8(rt);
        const auto remoteFunctionUnpackerSourceMap = args[17].asString(rt).utf8(rt);

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
            .remoteFunctionUnpacker =
                {.code = remoteFunctionUnpackerCode,
                 .location = remoteFunctionUnpackerLocation,
                 .sourceMap = remoteFunctionUnpackerSourceMap},
        });
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
      rt, obj, "createSerializableArrayBuffer", [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[1]) {
        const auto buffer = at<0>(args).getObject(rt).getArrayBuffer(rt);
        return makeSerializableArrayBuffer(rt, buffer);
      });

  jsi_utils::addMethod<2>(
      rt,
      obj,
      "createSerializableNonWorkletFunction",
      [jsScheduler = jsScheduler_, hostRuntimeId = hostRuntimeId_, rnRuntimeStatus = rnRuntimeStatus_](
          jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[2]) {
        auto fun = at<0>(args).getObject(rt).getFunction(rt);
        const auto name = at<1>(args).isUndefined() ? "" : at<1>(args).getString(rt).utf8(rt);
        if (fun.isHostFunction(rt)) {
          return makeSerializableHostFunction(
              rt, fun.getHostFunction(rt), name, fun.getProperty(rt, "length").getNumber());
        } else if (hostRuntimeId == RuntimeData::rnRuntimeId) {
          return makeRNRuntimeSerializableRemoteFunction(rt, name, fun, jsScheduler, rnRuntimeStatus);
        } else {
          return makeWorkletRuntimeSerializableRemoteFunction(rt, name, fun, hostRuntimeId);
        }
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

  jsi_utils::addMethod<3>(
      rt, obj, "createSerializableError", [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[3]) {
        auto name = at<0>(args).getString(rt).utf8(rt);
        auto message = at<1>(args).getString(rt).utf8(rt);

        std::optional<std::string> stack{};
        if (at<2>(args).isString()) {
          stack = at<2>(args).getString(rt).utf8(rt);
        }

        return makeSerializableError(rt, name, message, stack);
      });

  jsi_utils::addMethod<2>(
      rt, obj, "createSerializableRegExp", [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[2]) {
        const auto pattern = at<0>(args).getString(rt).utf8(rt);
        const auto flags = at<1>(args).getString(rt).utf8(rt);
        return makeSerializableRegExp(rt, pattern, flags);
      });

  jsi_utils::addMethod<4>(
      rt,
      obj,
      "createSerializableArrayBufferView",
      [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[4]) {
        const auto typeName = at<0>(args).getString(rt).utf8(rt);
        const auto arrayBuffer = at<1>(args).getObject(rt).getArrayBuffer(rt);
        const auto byteOffset = static_cast<size_t>(at<2>(args).getNumber());
        const auto length = static_cast<size_t>(at<3>(args).getNumber());
        return makeSerializableArrayBuffer(rt, arrayBuffer, ArrayBufferMetadata{typeName, byteOffset, length});
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

  jsi_utils::addMethod<2>(
      rt,
      obj,
      "scheduleOnRN",
      [jsScheduler = jsScheduler_](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[2]) {
        const auto &fun = at<0>(args).getObject(rt).getFunction(rt);
        const auto &remoteArgs = at<1>(args);

        auto serializableArgs = remoteArgs.isUndefined()
            ? nullptr
            : extractSerializableOrThrow<SerializableArray>(rt, remoteArgs, "[Worklets] Args must be an array.");

        if (!fun.getProperty(rt, "__remoteFunction").isUndefined()) [[likely]] { // NOLINT(readability/braces)
          const auto remoteFunction = extractSerializableOrThrow<SerializableRemoteFunction>(rt, fun);
          jsScheduler->scheduleOnJS([remoteFunction, serializableArgs](jsi::Runtime &rnRuntime) {
            const auto unpackedFun = remoteFunction->toJSValue(rnRuntime).getObject(rnRuntime).getFunction(rnRuntime);
            if (serializableArgs == nullptr) {
              // fast path for remote function w/o arguments
              unpackedFun.call(rnRuntime);
            } else {
              const auto args = serializableArgs->getJSIValueArr(rnRuntime);
              unpackedFun.call(rnRuntime, args.data(), args.size());
            }
          });
        } else if (fun.isHostFunction(rt)) {
          auto hostFun = fun.getHostFunction(rt);
          jsScheduler->scheduleOnJS([hostFun = std::move(hostFun), serializableArgs](jsi::Runtime &rnRuntime) {
            if (serializableArgs == nullptr) {
              // fast path for host function w/o arguments
              hostFun(rnRuntime, jsi::Value::undefined(), nullptr, 0);
            } else {
              const auto args = serializableArgs->getJSIValueArr(rnRuntime);
              hostFun(rnRuntime, jsi::Value::undefined(), args.data(), args.size());
            }
          });
        } else {
          const auto fnName = fun.getProperty(rt, "name").getString(rt).utf8(rt);
          const auto nameInError = fnName.empty() ? "" : " (" + fnName + ")";
          throw std::runtime_error(
              "[Worklets] Locally defined function passed to scheduleOnRN" + nameInError +
              ". Only functions defined on the RN Runtime or host functions can be scheduled on the RN Runtime. Define the function on the RN Runtime and pass it as a reference. See https://docs.swmansion.com/react-native-worklets/docs/guides/troubleshooting#locally-defined-function-passed-to-scheduleonrn for more details.");
        }
      });

  jsi_utils::addMethod<2>(
      rt,
      obj,
      "scheduleOnUI",
      [uiWorkletRuntime = uiWorkletRuntime_](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[2]) {
#ifndef NDEBUG
        scheduleOnUI(uiWorkletRuntime, rt, at<0>(args), at<1>(args));
#else
        scheduleOnUI(uiWorkletRuntime, rt, at<0>(args));
#endif // NDEBUG
      });

  jsi_utils::addMethod<2>(
      rt,
      obj,
      "runOnUISync",
      [uiWorkletRuntime = uiWorkletRuntime_](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[2]) {
#ifndef NDEBUG
        std::optional<std::string> scheduleStack;
        if (at<1>(args).isString()) {
          scheduleStack = at<1>(args).asString(rt).utf8(rt);
        }
        return runOnUISync(uiWorkletRuntime, rt, at<0>(args), scheduleStack);
#else
        return runOnUISync(uiWorkletRuntime, rt, at<0>(args));
#endif // NDEBUG
      });

  jsi_utils::addMethod<3>(
      rt, obj, "runOnRuntimeSync", [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[3]) {
#ifndef NDEBUG
        std::optional<std::string> scheduleStack;
        if (at<2>(args).isString()) {
          scheduleStack = at<2>(args).asString(rt).utf8(rt);
        }
        return runOnRuntimeSync(rt, at<0>(args), at<1>(args), scheduleStack);
#else
        return runOnRuntimeSync(rt, at<0>(args), at<1>(args));
#endif // NDEBUG
      });

  jsi_utils::addMethod<3>(
      rt,
      obj,
      "runOnRuntimeSyncWithId",
      [runtimeManager = runtimeManager_](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[3]) {
        const int runtimeId = at<0>(args).asNumber();
        const auto workletRuntime = runtimeManager->getRuntime(runtimeId);
        if (!workletRuntime) {
          throw jsi::JSError(
              rt, "[Worklets] runOnRuntimeSyncWithId: no worklet runtime found for id " + std::to_string(runtimeId));
        }
        auto serializableWorklet = extractSerializableOrThrow<SerializableWorklet>(
            rt, at<1>(args), "[Worklets] Only worklets can be executed on a worklet runtime.");
#ifndef NDEBUG
        std::optional<std::string> scheduleStack;
        if (at<2>(args).isString()) {
          scheduleStack = at<2>(args).asString(rt).utf8(rt);
        }
        return workletRuntime->runSyncSerializedWithStack(serializableWorklet, scheduleStack)->toJSValue(rt);
#else
        return workletRuntime->runSyncSerialized(serializableWorklet)->toJSValue(rt);
#endif // NDEBUG
      });

  jsi_utils::addMethod<5>(
      rt,
      obj,
      "createWorkletRuntime",
      [sourceProxy = shared_from_this()](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[5]) {
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
        const auto runtimeManager = sourceProxy->getRuntimeManager();

        return createWorkletRuntime(
            rt, runtimeManager, sourceProxy, name, serializableInitializer, asyncQueue, enableEventLoop);
      });

  jsi_utils::addMethod<3>(
      rt, obj, "scheduleOnRuntime", [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[3]) {
#ifndef NDEBUG
        std::optional<std::string> scheduleStack;
        if (at<2>(args).isString()) {
          scheduleStack = at<2>(args).asString(rt).utf8(rt);
        }
        worklets::scheduleOnRuntime(rt, at<0>(args), at<1>(args), scheduleStack);
#else
        worklets::scheduleOnRuntime(rt, at<0>(args), at<1>(args));
#endif // NDEBUG
      });

  jsi_utils::addMethod<3>(
      rt,
      obj,
      "scheduleOnRuntimeWithId",
      [runtimeManager = runtimeManager_](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[3]) {
        const int runtimeId = at<0>(args).asNumber();
        const auto workletRuntime = runtimeManager->getRuntime(runtimeId);
        if (!workletRuntime) {
          throw jsi::JSError(
              rt, "[Worklets] scheduleOnRuntimeWithId: no worklet runtime found for id " + std::to_string(runtimeId));
        }
        const auto worklet = extractSerializableOrThrow<SerializableWorklet>(
            rt, at<1>(args), "[Worklets] Only worklets can be scheduled to run on a worklet runtime.");
#ifndef NDEBUG
        std::optional<std::string> scheduleStack;
        if (at<2>(args).isString()) {
          scheduleStack = at<2>(args).asString(rt).utf8(rt);
        }
        workletRuntime->schedule(worklet, scheduleStack);
#else
        workletRuntime->schedule(worklet);
#endif // NDEBUG
      });

  jsi_utils::addMethod<2>(
      rt,
      obj,
      "handlePromise",
      [runtimeManager = runtimeManager_](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[2]) {
        const auto fun = at<0>(args).getObject(rt).getFunction(rt);
        // NOLINTNEXTLINE(readability/braces)
        if (fun.getProperty(rt, "__remoteFunction").isUndefined()) [[unlikely]] {
          // TODO: add a fast path for it in TypeScript
          fun.call(rt, extractSerializableOrThrow(rt, at<1>(args))->toJSValue(rt));
        } else {
          auto resolveOrReject = extractSerializableOrThrow<SerializableRemoteFunction>(rt, at<0>(args));
          auto valueOrError = extractSerializableOrThrow(rt, at<1>(args));
          resolveOrReject->resolveOrRejectPromise(valueOrError, runtimeManager);
        }
      });

  jsi_utils::addMethod<3>(
      rt,
      obj,
      "reportFatalErrorOnJS",
      [jsScheduler = jsScheduler_](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[3]) {
        return reportFatalErrorOnJS(
            jsScheduler,
            /* message */ at<0>(args).asString(rt).utf8(rt),
            /* stack */ at<1>(args).asString(rt).utf8(rt),
            /* name */ at<2>(args).asString(rt).utf8(rt));
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

  /* #region deprecated */

  jsi_utils::addMethod<2>(
      rt,
      obj,
      "createSerializableLEGACY",
      [hostRuntimeId = hostRuntimeId_](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[2]) {
        react_native_assert(
            hostRuntimeId != RuntimeData::rnRuntimeId &&
            "createSerializableLEGACY should never be called on the React Native runtime.");
        (void)hostRuntimeId;
        const auto &value = at<0>(args);
        const auto shouldRetainRemote = jsi::Value::undefined();
        const auto &nativeStateSource = at<1>(args);
        return makeSerializableClone(rt, value, shouldRetainRemote, nativeStateSource);
      });

  /* #endregion deprecated */

  return obj;
}

} // namespace worklets
