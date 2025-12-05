#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable.h>
#include <worklets/SharedItems/Shareable.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>

#include <memory>

namespace worklets {

jsi::Function Shareable::getShareableUnpacker(jsi::Runtime &rt) {
  return rt.global().getPropertyAsFunction(rt, "__shareableUnpacker");
}

Shareable::Shareable(
    const std::shared_ptr<Serializable> &initial,
    const std::weak_ptr<WorkletRuntime> &hostRuntime,
    const bool isInline)
    : Serializable(ValueType::ShareableType) {
  isInline_ = isInline;
  const auto strongHostRuntime = hostRuntime.lock(); // TODO: handle null
  strongHostRuntime->runSync([this, &initial](jsi::Runtime &rt) {
    try {
      const auto shareableUnpacker = getShareableUnpacker(rt);
      const auto shareable =
          shareableUnpacker.call(rt, jsi::Value::undefined(), true, initial->toJSValue(rt), jsi::Value(rt, isInline_));
      value_ = std::make_shared<jsi::Value>(rt, std::move(shareable));
    } catch (jsi::JSError &e) {
      e;
    }
  });
  hostRuntime_ = hostRuntime;
}

jsi::Value Shareable::toJSValue(jsi::Runtime &rt) {
  if (auto hostRuntime = hostRuntime_.lock()) {
    return jsi::Value(hostRuntime->getJSIRuntime(), *value_);
  } else {
    const auto shareableUnpacker = getShareableUnpacker(rt);
    const auto ref = SerializableJSRef::newNativeStateObject(rt, shared_from_this());
    return shareableUnpacker.call(rt, false, ref);
  }
}

} // namespace worklets
