#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable/SerializableRegExp.h>

#include <memory>
#include <string>

using namespace facebook;

namespace worklets {

jsi::Value SerializableRegExp::toJSValue(jsi::Runtime &rt) {
  return rt.global()
      .getPropertyAsFunction(rt, "RegExp")
      .callAsConstructor(rt, jsi::String::createFromUtf8(rt, pattern_), jsi::String::createFromUtf8(rt, flags_));
}

jsi::Value makeSerializableRegExp(jsi::Runtime &rt, const std::string &pattern, const std::string &flags) {
  auto serializable = std::make_shared<SerializableRegExp>(pattern, flags);
  return SerializableJSRef::newNativeStateObject(rt, serializable);
}

} // namespace worklets
