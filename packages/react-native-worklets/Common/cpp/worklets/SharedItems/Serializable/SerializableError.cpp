#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable/SerializableError.h>

#include <memory>
#include <optional>
#include <string>

using namespace facebook;

namespace worklets {

jsi::Value SerializableError::toJSValue(jsi::Runtime &rt) {
  auto error = rt.global()
                   .getPropertyAsFunction(rt, "Error")
                   .callAsConstructor(rt, jsi::String::createFromUtf8(rt, message_))
                   .getObject(rt);

  error.setProperty(rt, "name", jsi::String::createFromUtf8(rt, name_));

  if (stack_.has_value()) {
    error.setProperty(rt, "stack", jsi::String::createFromUtf8(rt, stack_.value()));
  } else {
    error.setProperty(rt, "stack", jsi::String::createFromUtf8(rt, ""));
  }

  return error;
}

jsi::Value makeSerializableError(
    jsi::Runtime &rt,
    const std::string &name,
    const std::string &message,
    const std::optional<std::string> &stack) {
  auto serializable = std::make_shared<SerializableError>(name, message, stack);
  return SerializableJSRef::newNativeStateObject(rt, serializable);
}

} // namespace worklets
