#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable/SerializableHostObject.h>

#include <memory>

using namespace facebook;

namespace worklets {

jsi::Value SerializableHostObject::toJSValue(jsi::Runtime &rt) {
  return jsi::Object::createFromHostObject(rt, hostObject_);
}

jsi::Value makeSerializableHostObject(jsi::Runtime &rt, const std::shared_ptr<jsi::HostObject> &value) {
  const auto serializable = std::make_shared<SerializableHostObject>(rt, value);
  return SerializableJSRef::newNativeStateObject(rt, serializable);
}

} // namespace worklets
