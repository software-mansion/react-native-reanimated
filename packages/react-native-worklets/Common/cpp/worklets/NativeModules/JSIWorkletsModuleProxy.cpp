#include <jsi/jsi.h>
#include <worklets/Compat/Holders.h>
#include <worklets/Compat/ReactNativeDebug.h>
#include <worklets/Compat/StableApi.h>
#include <worklets/NativeModules/JSIWorkletsModuleProxy.h>
#include <worklets/SharedItems/Serializable/CustomSerializable.h>
#include <worklets/SharedItems/Serializable/Serializable.h>
#include <worklets/SharedItems/Serializable/SerializableArray.h>
#include <worklets/SharedItems/Serializable/SerializableArrayBuffer.h>
#include <worklets/SharedItems/Serializable/SerializableBigInt.h>
#include <worklets/SharedItems/Serializable/SerializableError.h>
#include <worklets/SharedItems/Serializable/SerializableHostFunction.h>
#include <worklets/SharedItems/Serializable/SerializableHostObject.h>
#include <worklets/SharedItems/Serializable/SerializableImport.h>
#include <worklets/SharedItems/Serializable/SerializableMap.h>
#include <worklets/SharedItems/Serializable/SerializableObject.h>
#include <worklets/SharedItems/Serializable/SerializableRegExp.h>
#include <worklets/SharedItems/Serializable/SerializableRemoteFunction.h>
#include <worklets/SharedItems/Serializable/SerializableScalar.h>
#include <worklets/SharedItems/Serializable/SerializableSet.h>
#include <worklets/SharedItems/Serializable/SerializableString.h>
#include <worklets/SharedItems/Serializable/SerializableTurboModuleLike.h>
#include <worklets/SharedItems/Serializable/SerializableWorklet.h>
#include <worklets/SharedItems/Shareable.h>
#include <worklets/SharedItems/Synchronizable.h>
#include <worklets/SharedItems/SynchronizableDynamic.h>
#include <worklets/SharedItems/SynchronizableFixed.h>
#include <worklets/Tools/FeatureFlags.h>
#include <worklets/Tools/JSLogger.h>
#include <worklets/Tools/WorkletsJSIUtils.h>
#include <worklets/WorkletRuntime/BundleModeConfig.h>
#include <worklets/WorkletRuntime/RuntimeData.h>

#include <cmath>
#include <limits>
#include <memory>
#include <optional>
#include <sstream>
#include <stdexcept>
#include <string>
#include <thread>
#include <type_traits>
#include <utility>
#include <variant>
#include <vector>

using namespace facebook;

namespace worklets {

namespace {

inline void scheduleOnUI(
    const std::weak_ptr<WorkletRuntime> &weakUIWorkletRuntime,
    jsi::Runtime &rt,
    const jsi::Value &serializableArrayOfWorkletsValue,
    const jsi::Value &serializableArrayOfArgumentsValue
#ifndef NDEBUG
    ,
    const jsi::Value &scheduleStacksValue
#endif // NDEBUG
) {
  auto serializableArrayOfWorklets = extractSerializableOrThrow<SerializableArray>(
      rt, serializableArrayOfWorkletsValue, "[Worklets] scheduleOnUI expects a serializable array of worklets.");
  auto serializableArrayOfArguments = extractSerializableOrThrow<SerializableArray>(
      rt, serializableArrayOfArgumentsValue, "[Worklets] scheduleOnUI expects a serializable array of arguments.");

#ifndef NDEBUG
  std::vector<std::optional<std::string>> scheduleStacks;
  if (scheduleStacksValue.isObject()) {
    auto stacksObject = scheduleStacksValue.asObject(rt);
    if (stacksObject.isArray(rt)) {
      auto stacksArray = stacksObject.asArray(rt);
      scheduleStacks.resize(stacksArray.size(rt));
      for (size_t i = 0; i < scheduleStacks.size(); i++) {
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
#ifndef NDEBUG
  uiWorkletRuntime->scheduleWithStack(
      std::move(serializableArrayOfWorklets), std::move(serializableArrayOfArguments), std::move(scheduleStacks));
#else
  uiWorkletRuntime->schedule(std::move(serializableArrayOfWorklets), std::move(serializableArrayOfArguments));
#endif // NDEBUG
}

inline jsi::Value runOnUISync(
    const std::weak_ptr<WorkletRuntime> &weakUIWorkletRuntime,
    jsi::Runtime &rt,
    const jsi::Value &worklet
#ifndef NDEBUG
    ,
    const std::optional<std::string> &scheduleStack
#endif // NDEBUG
) {
  if (auto uiWorkletRuntime = weakUIWorkletRuntime.lock()) {
    auto serializableWorklet = extractSerializableOrThrow<SerializableWorklet>(
        rt, worklet, "[Worklets] Only worklets can be executed on UI runtime.");
#ifndef NDEBUG
    auto serializedResult = uiWorkletRuntime->runSyncWithStackAndDrainMicrotasks<std::shared_ptr<Serializable>>(
        serializableWorklet, scheduleStack);
#else
    auto serializedResult = uiWorkletRuntime->runSyncAndDrainMicrotasksSerialized(serializableWorklet);
#endif // NDEBUG
    return serializedResult->toJSValue(rt);
  }
  return jsi::Value::undefined();
}

jsi::Value runOnRuntimeSync(
    jsi::Runtime &rt,
    const jsi::Object &workletRuntimeObject,
    const jsi::Value &serializableWorkletValue
#ifndef NDEBUG
    ,
    const std::optional<std::string> &scheduleStack
#endif // NDEBUG
) {
  auto workletRuntime = workletRuntimeObject.getHostObject<WorkletRuntime>(rt);
  auto worklet = extractSerializableOrThrow<SerializableWorklet>(
      rt, serializableWorkletValue, "[Worklets] Only worklets can be executed on a worklet runtime.");
  if (workletRuntime->isAborted() && &rt != &workletRuntime->getJSIRuntime()) [[unlikely]] {
    throw jsi::JSError(rt, "[Worklets] Cannot run work on an aborted Worklet Runtime.");
  }
#ifndef NDEBUG
  auto serializedResult =
      workletRuntime->runSyncWithStackAndDrainMicrotasks<std::shared_ptr<Serializable>>(worklet, scheduleStack);
#else
  auto serializedResult = workletRuntime->runSyncAndDrainMicrotasksSerialized(worklet);
#endif // NDEBUG
  return serializedResult->toJSValue(rt);
}

template <typename TCall>
void callOnRN(
    [[maybe_unused]] const std::shared_ptr<JSScheduler> &jsScheduler,
    [[maybe_unused]] jsi::Runtime &rnRuntime,
    [[maybe_unused]] const std::optional<std::string> &scheduleStack,
    TCall &&call) {
#ifndef NDEBUG
  try {
    call();
  } catch (jsi::JSError &error) {
    JSLogger::handleJSError(jsScheduler, rnRuntime, RuntimeData::rnRuntimeName, error, scheduleStack);
  }
#else
  call();
#endif // NDEBUG
}

jsi::Value runOnRNSync(
    const std::shared_ptr<JSScheduler> &jsScheduler,
    jsi::Runtime &rt,
    const jsi::Value &funValue,
    const jsi::Value &argsValue
#ifndef NDEBUG
    ,
    const std::optional<std::string> &scheduleStack
#endif // NDEBUG
) {
  const auto funObject = funValue.getObject(rt);
  std::shared_ptr<Serializable> serializableFun;
  std::optional<jsi::HostFunctionType> hostFun;
  if (!funObject.getProperty(rt, "__remoteFunction").isUndefined()) [[likely]] {
    serializableFun = extractSerializableOrThrow<SerializableRemoteFunction>(rt, funValue);
  } else if (funObject.isFunction(rt) && funObject.getFunction(rt).isHostFunction(rt)) {
    hostFun = funObject.getFunction(rt).getHostFunction(rt);
  } else {
    serializableFun = extractSerializableOrThrow<SerializableWorklet>(
        rt,
        funValue,
        "[Worklets] Locally defined function passed to runOnRNSync. Only worklets, functions defined on the RN Runtime and host functions can be run on the RN Runtime.");
  }

  const auto serializableArgs = argsValue.isUndefined()
      ? nullptr
      : extractSerializableOrThrow<SerializableArray>(rt, argsValue, "[Worklets] Args must be an array.");

  std::shared_ptr<Serializable> serializedResult;
  std::optional<std::string> errorMessage;
  std::string errorStack;

  jsScheduler->runSyncOnJS([&](jsi::Runtime &rnRuntime) {
    try {
      const auto args =
          serializableArgs == nullptr ? std::vector<jsi::Value>{} : serializableArgs->getJSIValueArr(rnRuntime);
      const auto result = hostFun.has_value()
          ? (*hostFun)(rnRuntime, jsi::Value::undefined(), args.data(), args.size())
          : serializableFun->toJSValue(rnRuntime).getObject(rnRuntime).getFunction(rnRuntime).call(
                rnRuntime, args.data(), args.size());
      serializedResult = result.isUndefined()
          ? nullptr
          : extractSerializableOrThrow(
                rnRuntime, rnRuntime.global().getPropertyAsFunction(rnRuntime, "__serializer").call(rnRuntime, result));
    } catch (const jsi::JSError &error) {
      errorMessage = error.getMessage();
#ifndef NDEBUG
      errorStack =
          JSLogger::joinStacks(error.getMessage(), error.getStack(), RuntimeData::rnRuntimeName, scheduleStack);
#else
      errorStack = error.getStack();
#endif // NDEBUG
    } catch (const std::exception &error) {
      errorMessage = error.what();
    }
  });

  if (errorMessage.has_value()) {
    throw jsi::JSError(rt, *errorMessage, errorStack);
  }
  if (serializedResult == nullptr) {
    return jsi::Value::undefined();
  }
  return serializedResult->toJSValue(rt);
}

inline jsi::Value createWorkletRuntime(
    jsi::Runtime &originRuntime,
    const std::shared_ptr<RuntimeManager> &runtimeManager,
    const std::shared_ptr<const JSIWorkletsModuleProxy> &sourceProxy,
    const std::string &name,
    std::shared_ptr<SerializableWorklet> &initializer,
    const std::shared_ptr<AsyncQueue> &queue,
    bool enableEventLoop,
    bool enableLocking,
    bool enableNetworking,
    bool abortable) {
  const auto workletRuntime = runtimeManager->createWorkletRuntime(
      sourceProxy, name, initializer, queue, enableEventLoop, enableLocking, enableNetworking, abortable);
  return jsi::Object::createFromHostObject(originRuntime, workletRuntime);
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

inline jsi::Value synchronizableValueToJSValue(jsi::Runtime &rt, const SynchronizableValue &value) {
  return std::visit(
      [&rt](const auto &alternative) -> jsi::Value {
        using TAlternative = std::decay_t<decltype(alternative)>;
        if constexpr (std::is_same_v<TAlternative, std::shared_ptr<Serializable>>) {
          return alternative->toJSValue(rt);
        } else {
          return jsi::Value(alternative);
        }
      },
      value);
}

inline SynchronizableFixedValue jsValueToSynchronizableFixedValue(const jsi::Value &value) {
  if (value.isBool()) {
    return value.getBool();
  }
  if (value.isNumber()) {
    return value.getNumber();
  }
  throw std::runtime_error("[Worklets] Expected a number or boolean for a fixed-type Synchronizable.");
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
  runtimeManager->withRuntimeReadyPaused([&] {
    memoryManager->registerCustomSerializable(data);
    for (const auto &runtime : runtimeManager->getAllRuntimes()) {
      if (runtime->isLockingEnabled()) {
        memoryManager->loadCustomSerializable(runtime, data);
      }
    }
  });
}

std::shared_ptr<void> makePromiseDropGuard(
    jsi::Runtime &rt,
    const WorkletRuntime &workletRuntime,
    const jsi::Value &resolveValue,
    const jsi::Value &rejectValue) {
  if (!workletRuntime.isAbortable() || !rejectValue.isObject()) {
    return nullptr;
  }
  return std::make_shared<PromiseDropGuard>(
      extractSerializableOrThrow<SerializableRemoteFunction>(rt, resolveValue),
      extractSerializableOrThrow<SerializableRemoteFunction>(rt, rejectValue));
}

RuntimeData::RuntimeId runtimeIdFromJS(const jsi::Value &value) {
  react_native_assert(value.isNumber() && "[Worklets] Runtime id must be a number.");
  const auto runtimeId = value.getNumber();
  react_native_assert(std::isfinite(runtimeId) && "[Worklets] Runtime id must be a finite number.");
  react_native_assert(std::trunc(runtimeId) == runtimeId && "[Worklets] Runtime id must be an integer.");
  react_native_assert(runtimeId >= 0 && "[Worklets] Runtime id must not be negative.");
  react_native_assert(
      runtimeId < static_cast<double>(std::numeric_limits<RuntimeData::RuntimeId>::max()) &&
      "[Worklets] Runtime id must be smaller than 2^64.");
  return static_cast<RuntimeData::RuntimeId>(runtimeId);
}

} // namespace

jsi::Object JSIWorkletsModuleProxy::toOptimizedObject(jsi::Runtime &rt) const {
  auto obj = jsi::Object(rt);

  jsi_utils::addMethod(
      rt,
      obj,
      "loadUnpackersWithCode",
      [unpackerLoader = unpackerLoader_](
          jsi::Runtime &,
          std::string &&valueUnpackerCode,
          std::string &&valueUnpackerLocation,
          std::string &&valueUnpackerSourceMap,
          std::string &&synchronizableUnpackerCode,
          std::string &&synchronizableUnpackerLocation,
          std::string &&synchronizableUnpackerSourceMap,
          std::string &&customSerializableUnpackerCode,
          std::string &&customSerializableUnpackerLocation,
          std::string &&customSerializableUnpackerSourceMap,
          std::string &&shareableHostUnpackerCode,
          std::string &&shareableHostUnpackerLocation,
          std::string &&shareableHostUnpackerSourceMap,
          std::string &&shareableGuestUnpackerCode,
          std::string &&shareableGuestUnpackerLocation,
          std::string &&shareableGuestUnpackerSourceMap,
          std::string &&remoteFunctionUnpackerCode,
          std::string &&remoteFunctionUnpackerLocation,
          std::string &&remoteFunctionUnpackerSourceMap,
          bool isDev) {
        unpackerLoader->loadCodeUnpackers(
            {
                CodeUnpacker{
                    .code = std::move(valueUnpackerCode),
                    .location = std::move(valueUnpackerLocation),
                    .sourceMap = std::move(valueUnpackerSourceMap)},
                CodeUnpacker{
                    .code = std::move(synchronizableUnpackerCode),
                    .location = std::move(synchronizableUnpackerLocation),
                    .sourceMap = std::move(synchronizableUnpackerSourceMap)},
                CodeUnpacker{
                    .code = std::move(customSerializableUnpackerCode),
                    .location = std::move(customSerializableUnpackerLocation),
                    .sourceMap = std::move(customSerializableUnpackerSourceMap)},
                CodeUnpacker{
                    .code = std::move(shareableHostUnpackerCode),
                    .location = std::move(shareableHostUnpackerLocation),
                    .sourceMap = std::move(shareableHostUnpackerSourceMap)},
                CodeUnpacker{
                    .code = std::move(shareableGuestUnpackerCode),
                    .location = std::move(shareableGuestUnpackerLocation),
                    .sourceMap = std::move(shareableGuestUnpackerSourceMap)},
                CodeUnpacker{
                    .code = std::move(remoteFunctionUnpackerCode),
                    .location = std::move(remoteFunctionUnpackerLocation),
                    .sourceMap = std::move(remoteFunctionUnpackerSourceMap)},
            },
            isDev);
      });

  jsi_utils::addMethod(
      rt,
      obj,
      "loadUnpackersWithBytecode",
      [unpackerLoader = unpackerLoader_](
          jsi::Runtime &rt,
          const jsi::ArrayBuffer &valueUnpackerBytecode,
          const jsi::ArrayBuffer &synchronizableUnpackerBytecode,
          const jsi::ArrayBuffer &customSerializableUnpackerBytecode,
          const jsi::ArrayBuffer &shareableHostUnpackerBytecode,
          const jsi::ArrayBuffer &shareableGuestUnpackerBytecode,
          const jsi::ArrayBuffer &remoteFunctionUnpackerBytecode) {
        const auto bytecode = [&](const jsi::ArrayBuffer &buffer) {
          return std::vector<uint8_t>(buffer.data(rt), buffer.data(rt) + buffer.size(rt));
        };
        unpackerLoader->loadBytecodeUnpackers({
            BytecodeUnpacker{.bytecode = bytecode(valueUnpackerBytecode)},
            BytecodeUnpacker{.bytecode = bytecode(synchronizableUnpackerBytecode)},
            BytecodeUnpacker{.bytecode = bytecode(customSerializableUnpackerBytecode)},
            BytecodeUnpacker{.bytecode = bytecode(shareableHostUnpackerBytecode)},
            BytecodeUnpacker{.bytecode = bytecode(shareableGuestUnpackerBytecode)},
            BytecodeUnpacker{.bytecode = bytecode(remoteFunctionUnpackerBytecode)},
        });
      });

  jsi_utils::addMethod(rt, obj, "createSerializableBigInt", [](jsi::Runtime &rt, const jsi::BigInt &bigInt) {
    return makeSerializableBigInt(rt, bigInt);
  });

  jsi_utils::addMethod(rt, obj, "createSerializableBoolean", [](jsi::Runtime &rt, bool value) {
    return makeSerializableBoolean(rt, value);
  });

  jsi_utils::addMethod(
      rt, obj, "createSerializableImport", [](jsi::Runtime &rt, double source, const jsi::String &imported) {
        return makeSerializableImport(rt, source, imported);
      });

  jsi_utils::addMethod(rt, obj, "createSerializableNull", [](jsi::Runtime &rt) { return makeSerializableNull(rt); });

  jsi_utils::addMethod(rt, obj, "createSerializableNumber", [](jsi::Runtime &rt, double value) {
    return makeSerializableNumber(rt, value);
  });

  jsi_utils::addMethod(rt, obj, "createSerializableString", [](jsi::Runtime &rt, const jsi::String &value) {
    return makeSerializableString(rt, value);
  });

  jsi_utils::addMethod(
      rt, obj, "createSerializableUndefined", [](jsi::Runtime &rt) { return makeSerializableUndefined(rt); });

  jsi_utils::addMethod(rt, obj, "createSerializableHostObject", [](jsi::Runtime &rt, const jsi::Object &object) {
    return makeSerializableHostObject(rt, object.asHostObject(rt));
  });

  jsi_utils::addMethod(
      rt,
      obj,
      "createSerializableArray",
      [](jsi::Runtime &rt, const jsi::Array &array, const jsi::Value &shouldRetainRemote) {
        return makeSerializableArray(rt, array, shouldRetainRemote);
      });

  jsi_utils::addMethod(rt, obj, "createSerializableArrayBuffer", [](jsi::Runtime &rt, const jsi::ArrayBuffer &buffer) {
    return makeSerializableArrayBuffer(rt, buffer);
  });

  jsi_utils::addMethod(
      rt,
      obj,
      "createSerializableNonWorkletFunction",
      [jsScheduler = jsScheduler_,
       hostIdentity = hostRuntimeId_ == RuntimeData::rnRuntimeId
           ? RuntimeIdentity::forRNRuntime(rnRuntimeStatus_)
           : RuntimeIdentity::forWorkletRuntime(runtimeManager_, hostRuntimeId_)](
          jsi::Runtime &rt, const jsi::Function &fun, const std::optional<std::string> &functionName) {
        const auto name = functionName.value_or("");
        if (fun.isHostFunction(rt)) {
          return makeSerializableHostFunction(
              rt, fun.getHostFunction(rt), name, fun.getProperty(rt, "length").getNumber());
        }
        return makeSerializableRemoteFunction(
            rt, name, fun, hostIdentity, hostIdentity.isRNRuntime() ? jsScheduler : nullptr);
      });

  jsi_utils::addMethod(
      rt,
      obj,
      "createSerializableTurboModuleLike",
      [](jsi::Runtime &rt, const jsi::Object &props, const jsi::Object &proto) {
        return makeSerializableTurboModuleLike(rt, props, proto.asHostObject(rt));
      });

  jsi_utils::addMethod(
      rt,
      obj,
      "createSerializableObject",
      [](jsi::Runtime &rt, jsi::Object object, bool shouldRetainRemote, const jsi::Value &nativeStateSource) {
        return makeSerializableObject(rt, std::move(object), shouldRetainRemote, nativeStateSource);
      });

  jsi_utils::addMethod(
      rt, obj, "createSerializableMap", [](jsi::Runtime &rt, const jsi::Array &keys, const jsi::Array &values) {
        return makeSerializableMap(rt, keys, values);
      });

  jsi_utils::addMethod(rt, obj, "createSerializableSet", [](jsi::Runtime &rt, const jsi::Array &values) {
    return makeSerializableSet(rt, values);
  });

  jsi_utils::addMethod(
      rt,
      obj,
      "createSerializableError",
      [](jsi::Runtime &rt, const std::string &name, const std::string &message, const jsi::Value &stackValue) {
        std::optional<std::string> stack{};
        if (stackValue.isString()) {
          stack = stackValue.asString(rt).utf8(rt);
        }

        return makeSerializableError(rt, name, message, stack);
      });

  jsi_utils::addMethod(
      rt, obj, "createSerializableRegExp", [](jsi::Runtime &rt, const std::string &pattern, const std::string &flags) {
        return makeSerializableRegExp(rt, pattern, flags);
      });

  jsi_utils::addMethod(
      rt,
      obj,
      "createSerializableArrayBufferView",
      [](jsi::Runtime &rt,
         const std::string &typeName,
         const jsi::ArrayBuffer &buffer,
         double byteOffset,
         double length) {
        return makeSerializableArrayBuffer(
            rt, buffer, ArrayBufferMetadata{typeName, static_cast<size_t>(byteOffset), static_cast<size_t>(length)});
      });

  jsi_utils::addMethod(
      rt, obj, "createSerializableWorklet", [](jsi::Runtime &rt, const jsi::Object &worklet, bool shouldPersistRemote) {
        return makeSerializableWorklet(rt, worklet, shouldPersistRemote);
      });

  jsi_utils::addMethod(rt, obj, "makeWeakSerializableRef", [](jsi::Runtime &rt, const jsi::Value &serializableRef) {
    auto serializable =
        extractSerializableOrThrow(rt, serializableRef, "[Worklets] makeWeakSerializableRef expects a serializable.");
    auto marker = jsi::Object(rt);
    marker.setNativeState(rt, std::make_shared<WeakSerializableJSRef>(serializable));
    // Deliberately no `__serializableRef`, so JS never takes a marker for a serializable. A marker that
    // reaches C++ as a value is rejected, because its native state is not a SerializableJSRef.
    return marker;
  });

  jsi_utils::addMethod(rt, obj, "derefWeakSerializableRef", [](jsi::Runtime &rt, const jsi::Value &markerValue) {
    if (!markerValue.isObject()) {
      return jsi::Value::undefined();
    }
    auto marker = markerValue.getObject(rt);
    if (!marker.hasNativeState<WeakSerializableJSRef>(rt)) {
      return jsi::Value::undefined();
    }
    auto serializable = marker.getNativeState<WeakSerializableJSRef>(rt)->lock();
    if (!serializable) {
      return jsi::Value::undefined();
    }
    return jsi::Value(SerializableJSRef::newNativeStateObject(rt, serializable));
  });

  jsi_utils::addMethod(rt, obj, "createCustomSerializable", [](jsi::Runtime &rt, const jsi::Value &data, int typeId) {
    return makeCustomSerializable(rt, data, typeId);
  });

  jsi_utils::addMethod(
      rt,
      obj,
      "registerCustomSerializable",
      [memoryManager = memoryManager_, runtimeManager = runtimeManager_](
          jsi::Runtime &rt,
          const jsi::Value &determineValue,
          const jsi::Value &packValue,
          const jsi::Value &unpackValue,
          int typeId) {
        const auto determine = extractSerializableOrThrow<SerializableWorklet>(
            rt, determineValue, "[Worklets] Determine function must be a worklet.");
        const auto pack = extractSerializableOrThrow<SerializableWorklet>(
            rt, packValue, "[Worklets] Pack function must be a worklet.");
        const auto unpack = extractSerializableOrThrow<SerializableWorklet>(
            rt, unpackValue, "[Worklets] Unpack function must be a worklet.");
        registerCustomSerializable(runtimeManager, memoryManager, determine, pack, unpack, typeId);
      });

  jsi_utils::addMethod(
      rt,
      obj,
      "scheduleOnRN",
      [jsScheduler = jsScheduler_](
          jsi::Runtime &rt,
          const jsi::Function &fun,
          const jsi::Value &remoteArgs,
          const jsi::Value &scheduleStackValue) {
        auto serializableArgs = remoteArgs.isUndefined()
            ? nullptr
            : extractSerializableOrThrow<SerializableArray>(rt, remoteArgs, "[Worklets] Args must be an array.");

        std::optional<std::string> scheduleStack;
        if (scheduleStackValue.isString()) {
          scheduleStack = scheduleStackValue.asString(rt).utf8(rt);
        }

        if (!fun.getProperty(rt, "__remoteFunction").isUndefined()) [[likely]] {
          const auto remoteFunction = extractSerializableOrThrow<SerializableRemoteFunction>(rt, fun);
          jsScheduler->scheduleOnJS([jsScheduler, remoteFunction, serializableArgs, scheduleStack](
                                        jsi::Runtime &rnRuntime) {
            callOnRN(jsScheduler, rnRuntime, scheduleStack, [&]() {
              const auto unpackedFun = remoteFunction->toJSValue(rnRuntime).getObject(rnRuntime).getFunction(rnRuntime);
              if (serializableArgs == nullptr) {
                // fast path for remote function w/o arguments
                unpackedFun.call(rnRuntime);
              } else {
                const auto args = serializableArgs->getJSIValueArr(rnRuntime);
                unpackedFun.call(rnRuntime, args.data(), args.size());
              }
            });
          });
        } else if (fun.isHostFunction(rt)) {
          auto hostFun = fun.getHostFunction(rt);
          jsScheduler->scheduleOnJS(
              [jsScheduler, hostFun = std::move(hostFun), serializableArgs, scheduleStack](jsi::Runtime &rnRuntime) {
                callOnRN(jsScheduler, rnRuntime, scheduleStack, [&]() {
                  if (serializableArgs == nullptr) {
                    // fast path for host function w/o arguments
                    hostFun(rnRuntime, jsi::Value::undefined(), nullptr, 0);
                  } else {
                    const auto args = serializableArgs->getJSIValueArr(rnRuntime);
                    hostFun(rnRuntime, jsi::Value::undefined(), args.data(), args.size());
                  }
                });
              });
        } else {
          const auto fnName = fun.getProperty(rt, "name").getString(rt).utf8(rt);
          const auto nameInError = fnName.empty() ? "" : " (" + fnName + ")";
          throw std::runtime_error(
              "[Worklets] Locally defined function passed to scheduleOnRN" + nameInError +
              ". Only functions defined on the RN Runtime or host functions can be scheduled on the RN Runtime. Define the function on the RN Runtime and pass it as a reference. See https://docs.swmansion.com/react-native-worklets/docs/guides/troubleshooting#locally-defined-function-passed-to-scheduleonrn for more details.");
        }
      });

  jsi_utils::addMethod(
      rt,
      obj,
      "runOnRNSync",
      [jsScheduler = jsScheduler_](
          jsi::Runtime &rt,
          const jsi::Value &funValue,
          const jsi::Value &argsValue,
          [[maybe_unused]] const jsi::Value &scheduleStackValue) {
#ifndef NDEBUG
        std::optional<std::string> scheduleStack;
        if (scheduleStackValue.isString()) {
          scheduleStack = scheduleStackValue.asString(rt).utf8(rt);
        }
        return runOnRNSync(jsScheduler, rt, funValue, argsValue, scheduleStack);
#else
        return runOnRNSync(jsScheduler, rt, funValue, argsValue);
#endif // NDEBUG
      });

  jsi_utils::addMethod(
      rt,
      obj,
      "scheduleOnUI",
      [uiWorkletRuntime = uiWorkletRuntime_](
          jsi::Runtime &rt,
          const jsi::Value &worklets,
          const jsi::Value &arguments,
          [[maybe_unused]] const jsi::Value &scheduleStacks) {
#ifndef NDEBUG
        scheduleOnUI(uiWorkletRuntime, rt, worklets, arguments, scheduleStacks);
#else
        scheduleOnUI(uiWorkletRuntime, rt, worklets, arguments);
#endif // NDEBUG
      });

  jsi_utils::addMethod(
      rt,
      obj,
      "runOnUISync",
      [uiWorkletRuntime = uiWorkletRuntime_](
          jsi::Runtime &rt, const jsi::Value &worklet, [[maybe_unused]] const jsi::Value &scheduleStackValue) {
#ifndef NDEBUG
        std::optional<std::string> scheduleStack;
        if (scheduleStackValue.isString()) {
          scheduleStack = scheduleStackValue.asString(rt).utf8(rt);
        }
        return runOnUISync(uiWorkletRuntime, rt, worklet, scheduleStack);
#else
        return runOnUISync(uiWorkletRuntime, rt, worklet);
#endif // NDEBUG
      });

  jsi_utils::addMethod(
      rt,
      obj,
      "runOnRuntimeSync",
      [](jsi::Runtime &rt,
         const jsi::Object &workletRuntime,
         const jsi::Value &worklet,
         [[maybe_unused]] const jsi::Value &scheduleStackValue) {
#ifndef NDEBUG
        std::optional<std::string> scheduleStack;
        if (scheduleStackValue.isString()) {
          scheduleStack = scheduleStackValue.asString(rt).utf8(rt);
        }
        return runOnRuntimeSync(rt, workletRuntime, worklet, scheduleStack);
#else
        return runOnRuntimeSync(rt, workletRuntime, worklet);
#endif // NDEBUG
      });

  jsi_utils::addMethod(
      rt,
      obj,
      "runOnRuntimeSyncWithId",
      [runtimeManager = runtimeManager_](
          jsi::Runtime &rt,
          const jsi::Value &runtimeIdValue,
          const jsi::Value &worklet,
          [[maybe_unused]] const jsi::Value &scheduleStackValue) {
        const auto runtimeId = runtimeIdFromJS(runtimeIdValue);
        const auto workletRuntime = runtimeManager->getRuntime(runtimeId);
        if (!workletRuntime) {
          throw jsi::JSError(
              rt, "[Worklets] runOnRuntimeSyncWithId: no worklet runtime found for id " + std::to_string(runtimeId));
        }
        auto serializableWorklet = extractSerializableOrThrow<SerializableWorklet>(
            rt, worklet, "[Worklets] Only worklets can be executed on a worklet runtime.");
        if (workletRuntime->isAborted() && &rt != &workletRuntime->getJSIRuntime()) [[unlikely]] {
          throw jsi::JSError(rt, "[Worklets] Cannot run work on an aborted Worklet Runtime.");
        }
#ifndef NDEBUG
        std::optional<std::string> scheduleStack;
        if (scheduleStackValue.isString()) {
          scheduleStack = scheduleStackValue.asString(rt).utf8(rt);
        }
        auto serializedResult = workletRuntime->runSyncWithStackAndDrainMicrotasks<std::shared_ptr<Serializable>>(
            serializableWorklet, scheduleStack);
#else
        auto serializedResult = workletRuntime->runSyncAndDrainMicrotasksSerialized(serializableWorklet);
#endif // NDEBUG
        return serializedResult->toJSValue(rt);
      });

  jsi_utils::addMethod(
      rt,
      obj,
      "createWorkletRuntime",
      [sourceProxy = shared_from_this()](
          jsi::Runtime &rt,
          const std::string &name,
          const jsi::Value &initializer,
          bool useDefaultQueue,
          const jsi::Value &customQueue,
          bool enableEventLoop,
          bool enableLocking,
          bool enableNetworking,
          bool abortable) {
        auto serializableInitializer = extractSerializableOrThrow<SerializableWorklet>(
            rt, initializer, "[Worklets] Initializer must be a worklet.");
        std::shared_ptr<AsyncQueue> asyncQueue;
        if (useDefaultQueue) {
          asyncQueue = std::make_shared<AsyncQueueImpl>(name + "_queue");
        } else {
          asyncQueue = extractAsyncQueue(rt, customQueue);
        }

        const auto runtimeManager = sourceProxy->getRuntimeManager();

        return createWorkletRuntime(
            rt,
            runtimeManager,
            sourceProxy,
            name,
            serializableInitializer,
            asyncQueue,
            enableEventLoop,
            enableLocking,
            enableNetworking,
            abortable);
      });

  jsi_utils::addMethod(
      rt,
      obj,
      "scheduleOnRuntime",
      [](jsi::Runtime &rt,
         const jsi::Value &workletRuntimeValue,
         const jsi::Value &workletValue,
         [[maybe_unused]] const jsi::Value &scheduleStackValue,
         const jsi::Value &resolve,
         const jsi::Value &reject) {
        const auto workletRuntime = extractWorkletRuntime(rt, workletRuntimeValue);
        const auto worklet = extractSerializableOrThrow<SerializableWorklet>(
            rt, workletValue, "[Worklets] Function passed to `_scheduleOnRuntime` is not a serializable worklet.");
#ifndef NDEBUG
        if (workletRuntime->isAborted() && &rt != &workletRuntime->getJSIRuntime()) [[unlikely]] {
          rt.global()
              .getPropertyAsObject(rt, "console")
              .getPropertyAsFunction(rt, "warn")
              .call(
                  rt,
                  "[Worklets] Dropped work scheduled on the aborted Worklet Runtime \"" +
                      workletRuntime->getRuntimeName() + "\".");
        }
#endif // NDEBUG
        auto dropGuard = makePromiseDropGuard(rt, *workletRuntime, resolve, reject);
#ifndef NDEBUG
        std::optional<std::string> scheduleStack;
        if (scheduleStackValue.isString()) {
          scheduleStack = scheduleStackValue.asString(rt).utf8(rt);
        }
        workletRuntime->scheduleWithStack(worklet, scheduleStack, std::move(dropGuard));
#else
        workletRuntime->schedule(worklet, std::move(dropGuard));
#endif // NDEBUG
      });

  jsi_utils::addMethod(
      rt,
      obj,
      "scheduleOnRuntimeWithId",
      [runtimeManager = runtimeManager_](
          jsi::Runtime &rt,
          const jsi::Value &runtimeIdValue,
          const jsi::Value &workletValue,
          [[maybe_unused]] const jsi::Value &scheduleStackValue,
          const jsi::Value &resolve,
          const jsi::Value &reject) {
        const auto runtimeId = runtimeIdFromJS(runtimeIdValue);
        const auto workletRuntime = runtimeManager->getRuntime(runtimeId);
        if (!workletRuntime) {
          throw jsi::JSError(
              rt, "[Worklets] scheduleOnRuntimeWithId: no worklet runtime found for id " + std::to_string(runtimeId));
        }
        const auto worklet = extractSerializableOrThrow<SerializableWorklet>(
            rt, workletValue, "[Worklets] Only worklets can be scheduled to run on a worklet runtime.");
#ifndef NDEBUG
        if (workletRuntime->isAborted() && &rt != &workletRuntime->getJSIRuntime()) [[unlikely]] {
          rt.global()
              .getPropertyAsObject(rt, "console")
              .getPropertyAsFunction(rt, "warn")
              .call(
                  rt,
                  "[Worklets] Dropped work scheduled on the aborted Worklet Runtime \"" +
                      workletRuntime->getRuntimeName() + "\".");
        }
#endif // NDEBUG
        auto dropGuard = makePromiseDropGuard(rt, *workletRuntime, resolve, reject);
#ifndef NDEBUG
        std::optional<std::string> scheduleStack;
        if (scheduleStackValue.isString()) {
          scheduleStack = scheduleStackValue.asString(rt).utf8(rt);
        }
        workletRuntime->scheduleWithStack(worklet, scheduleStack, std::move(dropGuard));
#else
        workletRuntime->schedule(worklet, std::move(dropGuard));
#endif // NDEBUG
      });

  jsi_utils::addMethod(
      rt,
      obj,
      "abortWorkletRuntime",
      [runtimeManager = runtimeManager_](jsi::Runtime &rt, const jsi::Value &runtimeIdValue) {
        const auto runtimeId = runtimeIdFromJS(runtimeIdValue);
        const auto workletRuntime = runtimeManager->getRuntime(runtimeId);
        if (!workletRuntime) {
          return jsi::Value(false);
        }
        if (workletRuntime->getRuntimeKind() != RuntimeData::RuntimeKind::Worker) {
          throw jsi::JSError(rt, "[Worklets] abortWorkletRuntime: only Worker Runtimes can be aborted.");
        }
        if (!workletRuntime->isAbortable()) {
          throw jsi::JSError(
              rt,
              "[Worklets] abortWorkletRuntime: the Worklet Runtime \"" + workletRuntime->getRuntimeName() +
                  "\" was not created with `abortable: true`.");
        }
        workletRuntime->abort();
        return jsi::Value(true);
      });

  jsi_utils::addMethod(
      rt,
      obj,
      "handlePromise",
      [](jsi::Runtime &rt, const jsi::Function &resolveOrRejectFunction, const jsi::Value &valueOrErrorValue) {
        if (resolveOrRejectFunction.getProperty(rt, "__remoteFunction").isUndefined()) [[unlikely]] {
          // TODO: add a fast path for it in TypeScript
          resolveOrRejectFunction.call(rt, extractSerializableOrThrow(rt, valueOrErrorValue)->toJSValue(rt));
        } else {
          auto resolveOrReject = extractSerializableOrThrow<SerializableRemoteFunction>(rt, resolveOrRejectFunction);
          auto valueOrError = extractSerializableOrThrow(rt, valueOrErrorValue);
          resolveOrReject->resolveOrRejectPromise(valueOrError);
        }
      });

  jsi_utils::addMethod(
      rt,
      obj,
      "reportFatalErrorOnJS",
      [jsScheduler = jsScheduler_](
          jsi::Runtime &, const std::string &message, const std::string &stack, const std::string &name) {
        return reportFatalErrorOnJS(jsScheduler, message, stack, name);
      });

  jsi_utils::addMethod(rt, obj, "getStaticFeatureFlag", [](jsi::Runtime &, const std::string &name) {
    return worklets::StaticFeatureFlags::getFlag(name);
  });

  jsi_utils::addMethod(rt, obj, "setDynamicFeatureFlag", [](jsi::Runtime &, const std::string &name, bool value) {
    worklets::DynamicFeatureFlags::setFlag(name, value);
  });

  jsi_utils::addMethod(
      rt, obj, "isRuntimeAlive", [runtimeManager = runtimeManager_](jsi::Runtime &, const jsi::Value &runtimeIdValue) {
        const auto runtimeId = runtimeIdFromJS(runtimeIdValue);
        return jsi::Value(runtimeManager->isRuntimeAlive(runtimeId));
      });

  jsi_utils::addMethod(rt, obj, "getCurrentThreadId", [](jsi::Runtime &rt) {
    std::ostringstream stream;
    stream << std::this_thread::get_id();
    return jsi::String::createFromUtf8(rt, stream.str());
  });

  jsi_utils::addMethod(rt, obj, "createSynchronizable", [](jsi::Runtime &rt, const jsi::Value &value, bool isFixed) {
    if (isFixed) {
      return SerializableJSRef::newNativeStateObject(
          rt, SynchronizableFixed::make(jsValueToSynchronizableFixedValue(value)));
    } else {
      auto initial = extractSerializableOrThrow(rt, value, "[Worklets] Value must be a Serializable.");
      return SerializableJSRef::newNativeStateObject(rt, std::make_shared<SynchronizableDynamic>(initial));
    }
  });

  jsi_utils::addMethod(rt, obj, "synchronizableGetDirty", [](jsi::Runtime &rt, const jsi::Value &synchronizableRef) {
    return synchronizableValueToJSValue(
        rt, Synchronizable::extractSynchronizableOrThrow(rt, synchronizableRef)->getDirty());
  });

  jsi_utils::addMethod(rt, obj, "synchronizableGetBlocking", [](jsi::Runtime &rt, const jsi::Value &synchronizableRef) {
    return synchronizableValueToJSValue(
        rt, Synchronizable::extractSynchronizableOrThrow(rt, synchronizableRef)->getBlocking());
  });

  jsi_utils::addMethod(
      rt,
      obj,
      "synchronizableSetBlocking",
      [](jsi::Runtime &rt, const jsi::Value &synchronizableRef, const jsi::Value &newValue) {
        auto synchronizable = Synchronizable::extractSynchronizableOrThrow(rt, synchronizableRef);
        if (synchronizable->isFixed()) {
          synchronizable->setBlocking(jsValueToSynchronizableFixedValue(newValue));
        } else {
          synchronizable->setBlocking(
              extractSerializableOrThrow(rt, newValue, "[Worklets] Value must be a Serializable."));
        }
      });

  jsi_utils::addMethod(
      rt,
      obj,
      "synchronizableSetDirty",
      [](jsi::Runtime &rt, const jsi::Value &synchronizableRef, const jsi::Value &value) {
        Synchronizable::extractSynchronizableOrThrow(rt, synchronizableRef)
            ->setDirty(jsValueToSynchronizableFixedValue(value));
      });

  jsi_utils::addMethod(rt, obj, "synchronizableLock", [](jsi::Runtime &rt, const jsi::Value &synchronizableRef) {
    auto synchronizable = Synchronizable::extractSynchronizableOrThrow(rt, synchronizableRef);
    synchronizable->lock();
  });

  jsi_utils::addMethod(rt, obj, "synchronizableUnlock", [](jsi::Runtime &rt, const jsi::Value &synchronizableRef) {
    auto synchronizable = Synchronizable::extractSynchronizableOrThrow(rt, synchronizableRef);
    synchronizable->unlock();
  });

  jsi_utils::addMethod(
      rt,
      obj,
      "createShareable",
      [runtimeManager = runtimeManager_](
          jsi::Runtime &rt,
          const jsi::Value &hostRuntimeIdValue,
          const jsi::Value &initialValue,
          bool initSynchronously,
          const jsi::Value &decorateHostValue,
          const jsi::Value &decorateGuestValue) -> jsi::Value {
        const auto hostRuntimeId = runtimeIdFromJS(hostRuntimeIdValue);
        const auto hostRuntime = runtimeManager->getRuntime(hostRuntimeId);
        if (!hostRuntime) {
          throw jsi::JSError(
              rt, "[Worklets] createShareable: no worklet runtime found for id " + std::to_string(hostRuntimeId));
        }
        const auto initial = extractSerializableOrThrow(rt, initialValue, "[Worklets] Value must be a Serializable.");
        const auto decorateHost = extractSerializableOrThrow(rt, decorateHostValue);
        const auto decorateGuest = extractSerializableOrThrow(rt, decorateGuestValue);
        const auto shareable = std::make_shared<Shareable>(
            hostRuntime,
            RuntimeIdentity::forWorkletRuntime(runtimeManager, hostRuntime->getRuntimeId()),
            initial,
            initSynchronously,
            decorateHost,
            decorateGuest);
        return SerializableJSRef::newNativeStateObject(rt, shareable);
      });

#ifndef NDEBUG
  jsi_utils::addMethod(
      rt,
      obj,
      "propagateModuleUpdate",
      [runtimeManager = runtimeManager_](jsi::Runtime &, const std::string &code, const std::string &sourceUrl) {
        runtimeManager->propagateModuleUpdate(code, sourceUrl);
      });
#endif // NDEBUG

  jsi_utils::addMethod(rt, obj, "getUIRuntimeHolder", [uiWorkletRuntime = uiWorkletRuntime_](jsi::Runtime &rt) {
    const auto strongUIWorkletRuntime = uiWorkletRuntime.lock();
    if (!strongUIWorkletRuntime) {
      throw jsi::JSError(rt, "[Worklets] UI Worklet Runtime is not available.");
    }
    auto nativeState = std::make_shared<WorkletRuntimeHolder>(strongUIWorkletRuntime);
    auto obj = jsi::Object(rt);
    obj.setNativeState(rt, std::move(nativeState));
    return jsi::Value(std::move(obj));
  });

  jsi_utils::addMethod(rt, obj, "getUISchedulerHolder", [uiScheduler = uiScheduler_](jsi::Runtime &rt) {
    auto nativeState = std::make_shared<UISchedulerHolder>(uiScheduler);
    auto obj = jsi::Object(rt);
    obj.setNativeState(rt, std::move(nativeState));
    return jsi::Value(std::move(obj));
  });

  /* #region deprecated */

  jsi_utils::addMethod(
      rt,
      obj,
      "createSerializableLEGACY",
      [hostRuntimeId = hostRuntimeId_](jsi::Runtime &rt, const jsi::Value &value, const jsi::Value &nativeStateSource) {
        react_native_assert(
            hostRuntimeId != RuntimeData::rnRuntimeId &&
            "createSerializableLEGACY should never be called on the React Native runtime.");
        (void)hostRuntimeId;
        const auto shouldRetainRemote = jsi::Value::undefined();
        return makeSerializableClone(rt, value, shouldRetainRemote, nativeStateSource);
      });

  /* #endregion deprecated */

  return obj;
}

} // namespace worklets
