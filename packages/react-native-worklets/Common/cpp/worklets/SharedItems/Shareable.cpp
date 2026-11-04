#include <jsi/jsi.h>
#include <react/debug/react_native_assert.h>
#include <worklets/SharedItems/Serializable/Serializable.h>
#include <worklets/SharedItems/Shareable.h>
#include <worklets/WorkletRuntime/RuntimeIdentity.h>
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
    RuntimeIdentity hostIdentity,
    const std::shared_ptr<Serializable> &initial,
    const bool initSynchronously,
    const std::shared_ptr<Serializable> &decorateHost,
    const std::shared_ptr<Serializable> &decorateGuest)
    : Serializable(ValueType::ShareableType),
      hostIdentity_(std::move(hostIdentity)),
      initial_(initial),
      initSynchronously_(initSynchronously),
      decorateHost_(decorateHost),
      decorateGuest_(decorateGuest) {
  if (initSynchronously) {
    hostRuntime->runSync([this](jsi::Runtime &rt) { initHostValue(rt); });
  }
}

Shareable::~Shareable() {
  cleanupRuntimeAware(hostIdentity_, hostValue_);
}

jsi::Value Shareable::toJSValue(jsi::Runtime &rt) {
  if (isHostRuntime(rt)) {
    return hostJSValue(rt);
  }
  return guestJSValue(rt);
}

bool Shareable::isHostRuntime(jsi::Runtime &rt) const {
  const auto *identity = findRuntimeIdentity(rt);
  return identity != nullptr && identity->isSameRuntime(hostIdentity_);
}

jsi::Value Shareable::hostJSValue(jsi::Runtime &rt) {
  react_native_assert(isHostRuntime(rt) && "[Worklets] Shareable host value requested on a non-host runtime.");
  if (!initSynchronously_ && !hostValue_) {
    std::lock_guard lock(initializationMutex_);
    if (!hostValue_) {
      initHostValue(rt);
    }
  }

  return jsi::Value(rt, *hostValue_);
}

jsi::Value Shareable::guestJSValue(jsi::Runtime &rt) {
  const auto shareableUnpacker = getShareableGuestUnpacker(rt);
  const auto ref = SerializableJSRef::newNativeStateObject(rt, shared_from_this());
  return shareableUnpacker.call(
      rt, static_cast<double>(hostIdentity_.getRuntimeId()), ref, decorateGuest_->toJSValue(rt));
}

void Shareable::initHostValue(jsi::Runtime &rt) {
  react_native_assert(isHostRuntime(rt) && "[Worklets] Shareable host value initialized on a non-host runtime.");
  const auto shareableUnpacker = getShareableHostUnpacker(rt);
  const auto shareable = shareableUnpacker.call(rt, initial_->toJSValue(rt), decorateHost_->toJSValue(rt));
  hostValue_ = std::make_unique<jsi::Value>(rt, std::move(shareable));
  initial_.reset();
  decorateHost_.reset();
}

} // namespace worklets
