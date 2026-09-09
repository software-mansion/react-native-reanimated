#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable/SerializableTurboModuleLike.h>

#include <memory>

using namespace facebook;

namespace worklets {

jsi::Value SerializableTurboModuleLike::toJSValue(jsi::Runtime &rt) {
  auto obj = properties_->toJSValue(rt).asObject(rt);
  const auto prototype = proto_->toJSValue(rt);
  rt.global().getPropertyAsObject(rt, "Object").getPropertyAsFunction(rt, "setPrototypeOf").call(rt, obj, prototype);

  return obj;
}

jsi::Value makeSerializableTurboModuleLike(
    jsi::Runtime &rt,
    const jsi::Object &object,
    const std::shared_ptr<jsi::HostObject> &proto) {
  const auto serializable = std::make_shared<SerializableTurboModuleLike>(rt, object, proto);
  return SerializableJSRef::newNativeStateObject(rt, serializable);
}

} // namespace worklets
