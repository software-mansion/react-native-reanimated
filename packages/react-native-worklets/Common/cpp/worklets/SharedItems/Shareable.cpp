#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable.h>
#include <worklets/SharedItems/Shareable.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>

#include <memory>
#include <mutex>
#include <utility>

namespace worklets {

jsi::Function Shareable::getShareableHostUnpacker(jsi::Runtime &rt) {
  return rt.global().getPropertyAsFunction(rt, "__shareableHostUnpacker");
}

jsi::Function Shareable::getShareableGuestUnpacker(jsi::Runtime &rt) {
  return rt.global().getPropertyAsFunction(rt, "__shareableGuestUnpacker");
}

Shareable::Shareable(
    const std::shared_ptr<WorkletRuntime> &hostRuntime,
    const std::shared_ptr<Serializable> &initial,
    const bool initSynchronously,
    const std::shared_ptr<Serializable> &decorateHost,
    const std::shared_ptr<Serializable> &decorateGuest)
    : Serializable(ValueType::ShareableType),
      weakHostRuntime_(hostRuntime),
      hostRuntimeId_(hostRuntime->getRuntimeId()),
      hostJSIRuntime_(hostRuntime->getJSIRuntime()),
      initial_(initial),
      initSynchronously_(initSynchronously),
      decorateHost_(decorateHost),
      decorateGuest_(decorateGuest) {
  if (initSynchronously) {
    hostRuntime->runSync([this](jsi::Runtime &rt) { initHostValue(); });
  }
}

Shareable::~Shareable() {
  const auto strongHostRuntime = weakHostRuntime_.lock();
  if (strongHostRuntime && hostValue_) {
    strongHostRuntime->runSync([this](jsi::Runtime &rt) { hostValue_.reset(); });
  } else {
    hostValue_.release();
  }
}

jsi::Value Shareable::toJSValue(jsi::Runtime &rt) {
  if (&rt == &hostJSIRuntime_) {
    return hostJSValue();
  } else {
    return guestJSValue(rt);
  }
}

jsi::Value Shareable::hostJSValue() {
  if (!initSynchronously_ && !hostValue_) {
    std::lock_guard lock(initializationMutex_);
    if (!hostValue_) {
      initHostValue();
    }
  }

  return jsi::Value(hostJSIRuntime_, *hostValue_);
}

jsi::Value Shareable::guestJSValue(jsi::Runtime &rt) {
  const auto shareableUnpacker = getShareableGuestUnpacker(rt);
  const auto ref = SerializableJSRef::newNativeStateObject(rt, shared_from_this());
  return shareableUnpacker.call(rt, static_cast<double>(hostRuntimeId_), ref, decorateGuest_->toJSValue(rt));
}

void Shareable::initHostValue() {
  const auto shareableUnpacker = getShareableHostUnpacker(hostJSIRuntime_);
  const auto shareable = shareableUnpacker.call(
      hostJSIRuntime_, initial_->toJSValue(hostJSIRuntime_), decorateHost_->toJSValue(hostJSIRuntime_));
  hostValue_ = std::make_unique<jsi::Value>(hostJSIRuntime_, std::move(shareable));
  initial_.reset();
  decorateHost_.reset();
}

} // namespace worklets
