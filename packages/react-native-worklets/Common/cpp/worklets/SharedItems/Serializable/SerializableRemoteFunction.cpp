#include <jsi/jsi.h>
#include <react/debug/react_native_assert.h>
#include <worklets/SharedItems/Serializable/Serializable.h>
#include <worklets/SharedItems/Serializable/SerializableRemoteFunction.h>
#include <worklets/WorkletRuntime/RuntimeManager.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>

#include <memory>

using namespace facebook;

namespace worklets {

namespace {

jsi::Function getRemoteFunctionUnpacker(jsi::Runtime &rt) {
  auto remoteFunctionUnpacker = rt.global().getProperty(rt, "__remoteFunctionUnpacker");
  react_native_assert(remoteFunctionUnpacker.isObject() && "remoteFunctionUnpacker not found");
  return remoteFunctionUnpacker.asObject(rt).asFunction(rt);
}

} // namespace

SerializableRemoteFunction::~SerializableRemoteFunction() {
  if (isHostedOnRNRuntime()) {
    rnRuntimeStatus_->runWhileLocked([this](bool isDead) {
      if (isDead) {
        freeWithoutCallingDestructor(function_);
      } else {
        function_.reset();
      }
    });
  } else {
    cleanupRuntimeAware(hostRuntime_, function_);
  }
}

jsi::Value SerializableRemoteFunction::toJSValue(jsi::Runtime &rt) {
  if (&rt == hostRuntime_) {
    return jsi::Value(rt, *function_);
  } else {
    const auto name = name_.empty() ? jsi::Value::undefined() : jsi::String::createFromUtf8(rt, name_);
    auto holderFunction = getRemoteFunctionUnpacker(rt).call(rt, name).getObject(rt);
    holderFunction.setNativeState(rt, std::make_shared<SerializableJSRef>(shared_from_this()));
    return holderFunction;
  }
}

// TODO: generalize it and merge with other scheduling methods
void SerializableRemoteFunction::resolveOrRejectPromise(
    const std::shared_ptr<Serializable> &resolveValue,
    const std::shared_ptr<RuntimeManager> &runtimeManager) {
  if (isHostedOnRNRuntime()) {
    jsScheduler_->scheduleOnJS([resolver = shared_from_this(), resolveValue](jsi::Runtime &rt) {
      resolver->toJSValue(rt).getObject(rt).getFunction(rt).call(rt, resolveValue->toJSValue(rt));
    });
  } else {
    const auto workletRuntime = runtimeManager->getRuntime(hostRuntimeId_);
    // NOLINTNEXTLINE(readability/braces)
    if (!workletRuntime) [[unlikely]] {
      // Host runtime is dead, most likely we're the last owner of the Remote Function.
      // Do nothing.
    } else {
      workletRuntime->schedule([resolver = shared_from_this(), resolveValue](jsi::Runtime &rt) {
        resolver->toJSValue(rt).getObject(rt).getFunction(rt).call(rt, resolveValue->toJSValue(rt));
      });
    }
  }
}

jsi::Value makeRNRuntimeSerializableRemoteFunction(
    jsi::Runtime &rnRuntime,
    const std::string &name,
    const jsi::Function &function,
    const std::shared_ptr<JSScheduler> &jsScheduler,
    const std::shared_ptr<RNRuntimeStatus> &rnRuntimeStatus) {
  auto serializable = std::make_shared<SerializableRemoteFunction>(
      rnRuntime,
      name,
      jsi::Value(rnRuntime, function).getObject(rnRuntime).getFunction(rnRuntime),
      jsScheduler,
      rnRuntimeStatus);
  return SerializableJSRef::newNativeStateObject(rnRuntime, serializable);
}

jsi::Value makeWorkletRuntimeSerializableRemoteFunction(
    jsi::Runtime &workletRuntime,
    const std::string &name,
    const jsi::Function &function,
    RuntimeData::RuntimeId hostRuntimeId) {
  auto serializable = std::make_shared<SerializableRemoteFunction>(
      workletRuntime,
      name,
      jsi::Value(workletRuntime, function).getObject(workletRuntime).getFunction(workletRuntime),
      hostRuntimeId);
  return SerializableJSRef::newNativeStateObject(workletRuntime, serializable);
}

} // namespace worklets
