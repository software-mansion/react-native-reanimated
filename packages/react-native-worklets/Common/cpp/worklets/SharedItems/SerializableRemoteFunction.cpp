#include <jsi/jsi.h>
#include <react/debug/react_native_assert.h>
#include <worklets/SharedItems/Serializable.h>
#include <worklets/SharedItems/SerializableRemoteFunction.h>
#include <worklets/WorkletRuntime/RuntimeManager.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>

#include <memory>
#include <utility>

using namespace facebook;

namespace worklets {

namespace {

jsi::Function getRemoteFunctionUnpacker(jsi::Runtime &rt) {
  auto remoteFunctionUnpacker = rt.global().getProperty(rt, "__remoteFunctionUnpacker");
  react_native_assert(remoteFunctionUnpacker.isObject() && "remoteFunctionUnpacker not found");
  return remoteFunctionUnpacker.asObject(rt).asFunction(rt);
}

jsi::Object getRemoteFunctionRegistry(jsi::Runtime &rt) {
  auto registry = rt.global().getProperty(rt, "__remoteFunctionRegistry");
  react_native_assert(registry.isObject() && "remoteFunctionRegistry not found");
  return registry.getObject(rt);
}

} // namespace

SerializableRemoteFunction::~SerializableRemoteFunction() = default;

jsi::Value SerializableRemoteFunction::unpackSelf(jsi::Runtime &rt) {
  const auto nameValue = name_.empty() ? jsi::Value::undefined() : jsi::String::createFromUtf8(rt, name_);
  auto holderFunction = getRemoteFunctionUnpacker(rt).call(rt, nameValue).getObject(rt);
  holderFunction.setNativeState(rt, std::make_shared<SerializableJSRef>(shared_from_this()));
  return holderFunction;
}

jsi::Value SerializableRemoteFunction::RNOrigin::toJSValue(jsi::Runtime &rt) {
  if (&rt == hostRuntime_) {
    const auto registry = getRemoteFunctionRegistry(rt);
    return registry.getPropertyAsFunction(rt, "get").callWithThis(rt, registry, jsi::Value(remoteId_));
  }
  std::shared_ptr<SerializableRemoteFunction> proxy;
  {
    std::lock_guard<std::mutex> lock(proxyMutex_);
    proxy = proxy_.lock();
    if (!proxy) {
      auto self = std::static_pointer_cast<RNOrigin>(shared_from_this());
      proxy = std::make_shared<RNOriginProxy>(self);
      proxy_ = proxy;
    }
  }
  return proxy->toJSValue(rt);
}

void SerializableRemoteFunction::RNOrigin::resolveOrRejectPromise(
    const std::shared_ptr<Serializable> &resolveValue,
    const std::shared_ptr<RuntimeManager> & /*runtimeManager*/) {
  jsScheduler_->scheduleOnJS([resolver = shared_from_this(), resolveValue](jsi::Runtime &rt) {
    resolver->toJSValue(rt).getObject(rt).getFunction(rt).call(rt, resolveValue->toJSValue(rt));
  });
}

SerializableRemoteFunction::WorkletOrigin::~WorkletOrigin() {
  cleanupRuntimeAware(hostRuntime_, function_);
}

jsi::Value SerializableRemoteFunction::WorkletOrigin::toJSValue(jsi::Runtime &rt) {
  if (&rt == hostRuntime_) {
    return jsi::Value(rt, *function_);
  }
  return unpackSelf(rt);
}

void SerializableRemoteFunction::WorkletOrigin::resolveOrRejectPromise(
    const std::shared_ptr<Serializable> &resolveValue,
    const std::shared_ptr<RuntimeManager> &runtimeManager) {
  const auto workletRuntime = runtimeManager->getRuntime(hostRuntimeId_);
  // NOLINTNEXTLINE(readability/braces)
  if (!workletRuntime) [[unlikely]] {
    return;
  }
  workletRuntime->schedule([resolver = shared_from_this(), resolveValue](jsi::Runtime &rt) {
    resolver->toJSValue(rt).getObject(rt).getFunction(rt).call(rt, resolveValue->toJSValue(rt));
  });
}

SerializableRemoteFunction::RNOrigin::RNOriginProxy::RNOriginProxy(const std::shared_ptr<RNOrigin> &origin)
    : SerializableRemoteFunction(nullptr, origin->getHostRuntimeId(), origin->getName()), origin_(origin) {}

SerializableRemoteFunction::RNOrigin::RNOriginProxy::~RNOriginProxy() {
  origin_->getJSScheduler()->scheduleOnJS([id = origin_->getRemoteId()](jsi::Runtime &rt) {
    const auto registry = getRemoteFunctionRegistry(rt);
    registry.getPropertyAsFunction(rt, "delete").callWithThis(rt, registry, jsi::Value(id));
  });
}

jsi::Value SerializableRemoteFunction::RNOrigin::RNOriginProxy::toJSValue(jsi::Runtime &rt) {
  if (&rt == origin_->getHostRuntime()) {
    return origin_->toJSValue(rt);
  }
  return unpackSelf(rt);
}

void SerializableRemoteFunction::RNOrigin::RNOriginProxy::resolveOrRejectPromise(
    const std::shared_ptr<Serializable> &resolveValue,
    const std::shared_ptr<RuntimeManager> &runtimeManager) {
  origin_->resolveOrRejectPromise(resolveValue, runtimeManager);
}

} // namespace worklets
