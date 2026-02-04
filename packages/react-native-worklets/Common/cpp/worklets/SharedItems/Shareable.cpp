#include <glog/logging.h>
#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable.h>
#include <worklets/SharedItems/Shareable.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>

#include <memory>
#include <stdexcept>

namespace worklets {

jsi::Function Shareable::getShareableHostUnpacker(jsi::Runtime &rt) {
  return rt.global().getPropertyAsFunction(rt, "__shareableHostUnpacker");
}

jsi::Function Shareable::getShareableGuestUnpacker(jsi::Runtime &rt) {
  return rt.global().getPropertyAsFunction(rt, "__shareableGuestUnpacker");
}

Shareable::Shareable(
    const std::weak_ptr<WorkletRuntime> &hostRuntime,
    const std::shared_ptr<Serializable> &initial,
    const std::shared_ptr<Serializable> &decorateHost,
    const std::shared_ptr<Serializable> &decorateGuest)
    : Serializable(ValueType::ShareableType),
      hostRuntime_(hostRuntime),
      initial_(initial),
      decorateHost_(decorateHost),
      decorateGuest_(decorateGuest) {
  const auto strongHostRuntime = hostRuntime.lock(); // TODO: handle null
  strongHostRuntime->runSync([this](jsi::Runtime &rt) {
    try {
      const auto shareableUnpacker = getShareableHostUnpacker(rt);
      const auto shareable = shareableUnpacker.call(rt, initial_->toJSValue(rt), decorateHost_->toJSValue(rt));
      hostValue_ = std::make_unique<jsi::Value>(rt, std::move(shareable));
    } catch (jsi::JSError &e) {
      throw std::runtime_error("[Worklets] Failed to create Shareable value: " + std::string(e.what()));
    }
  });
}

Shareable::~Shareable() {
  const auto strongHostRuntime = hostRuntime_.lock();
  if (strongHostRuntime && hostValue_) {
    strongHostRuntime->runSync([this](jsi::Runtime &rt) { cleanupIfRuntimeExists(&rt, hostValue_); });
  } else {
    hostValue_.release();
  }
}

jsi::Value Shareable::toJSValue(jsi::Runtime &rt) {
  const auto weakWorkletRuntime = WorkletRuntime::getWeakRuntimeFromJSIRuntime(rt);
  const auto strongWorkletRuntime = weakWorkletRuntime.lock();
  const auto strongHostRuntime = hostRuntime_.lock();
  if (!strongWorkletRuntime || !strongHostRuntime) {
    // return jsi::Value::undefined(); // TODO: Handle it properly
    // RN Runtime
    const auto shareableUnpacker = getShareableHostUnpacker(rt);
    const auto ref = SerializableJSRef::newNativeStateObject(rt, shared_from_this());
    return shareableUnpacker.call(rt, ref, decorateHost_->toJSValue(rt));
  }
  if (strongWorkletRuntime == strongHostRuntime) {
    auto propertyNames = hostValue_->asObject(rt).getPropertyNames(rt);
    for (int i = 0; i < propertyNames.length(rt); i++) {
      LOG(INFO) << (propertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt));
    }
    return jsi::Value(strongHostRuntime->getJSIRuntime(), *hostValue_);
  } else {
    const auto shareableUnpacker = getShareableGuestUnpacker(rt);
    const auto ref = SerializableJSRef::newNativeStateObject(rt, shared_from_this());
    return shareableUnpacker.call(rt, ref, decorateGuest_->toJSValue(rt));
  }
}

} // namespace worklets
