#include <jsi/jsi.h>
#if __has_include(<React/Debug.h>)
#include <React/Debug.h>
#else
#include <react/debug/react_native_assert.h>
#endif
#include <worklets/SharedItems/Serializable/Serializable.h>
#include <worklets/SharedItems/Serializable/SerializableError.h>
#include <worklets/SharedItems/Serializable/SerializableRemoteFunction.h>
#include <worklets/WorkletRuntime/RuntimeManager.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>

#include <memory>
#include <optional>

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
  cleanupRuntimeAware(hostIdentity_, function_);
}

jsi::Value SerializableRemoteFunction::toJSValue(jsi::Runtime &rt) {
  const auto *identity = findRuntimeIdentity(rt);
  if (identity != nullptr && identity->isSameRuntime(hostIdentity_)) {
    return jsi::Value(rt, *function_);
  } else {
    const auto name = name_.empty() ? jsi::Value::undefined() : jsi::String::createFromUtf8(rt, name_);
    auto holderFunction = getRemoteFunctionUnpacker(rt).call(rt, name).getObject(rt);
    holderFunction.setNativeState(rt, std::make_shared<SerializableJSRef>(shared_from_this()));
    return holderFunction;
  }
}

// TODO: generalize it and merge with other scheduling methods
void SerializableRemoteFunction::resolveOrRejectPromise(const std::shared_ptr<Serializable> &resolveValue) {
  settled_ = true;
  if (isHostedOnRNRuntime()) {
    runWhileOwnerLocked(hostIdentity_, [&](bool isAlive) {
      if (!isAlive) [[unlikely]] {
        return;
      }
      jsScheduler_->scheduleOnJS([resolver = shared_from_this(), resolveValue](jsi::Runtime &rt) {
        resolver->toJSValue(rt).getObject(rt).getFunction(rt).call(rt, resolveValue->toJSValue(rt));
      });
    });
  } else {
    const auto runtimeManager = hostIdentity_.lockRuntimeManager();
    const auto workletRuntime = runtimeManager ? runtimeManager->getRuntime(hostIdentity_.getRuntimeId()) : nullptr;
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

PromiseDropGuard::~PromiseDropGuard() {
  if (resolve_->isSettled() || reject_->isSettled()) {
    return;
  }
  try {
    reject_->resolveOrRejectPromise(std::make_shared<SerializableError>(
        "Error", "[Worklets] The Worklet Runtime was aborted or destroyed before the worklet finished.", std::nullopt));
  } catch (...) {
    // A destructor must not throw.
  }
}

jsi::Value makeSerializableRemoteFunction(
    jsi::Runtime &hostRuntime,
    const std::string &name,
    const jsi::Function &function,
    const RuntimeIdentity &hostIdentity,
    const std::shared_ptr<JSScheduler> &jsScheduler) {
  auto serializable = std::make_shared<SerializableRemoteFunction>(
      hostRuntime,
      name,
      jsi::Value(hostRuntime, function).getObject(hostRuntime).getFunction(hostRuntime),
      hostIdentity,
      jsScheduler);
  return SerializableJSRef::newNativeStateObject(hostRuntime, serializable);
}

} // namespace worklets
