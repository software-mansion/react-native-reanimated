#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable/SerializableString.h>

#include <memory>

using namespace facebook;

namespace worklets {

jsi::Value SerializableString::toJSValue(jsi::Runtime &rt) {
  return jsi::String::createFromUtf8(rt, data_);
}

jsi::Value makeSerializableString(jsi::Runtime &rt, const jsi::String &string) {
  const auto serializable = std::make_shared<SerializableString>(string.utf8(rt));
  return SerializableJSRef::newNativeStateObject(rt, serializable);
}

} // namespace worklets
