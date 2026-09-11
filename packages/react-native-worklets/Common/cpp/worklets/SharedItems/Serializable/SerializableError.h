#pragma once

#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable/Serializable.h>

#include <optional>
#include <string>

namespace worklets {

class SerializableError : public Serializable {
 public:
  SerializableError(const std::string &name, const std::string &message, const std::optional<std::string> &stack)
      : Serializable(ValueType::ErrorType), name_(name), message_(message), stack_(stack) {}

  facebook::jsi::Value toJSValue(facebook::jsi::Runtime &rt) override;

 protected:
  const std::string name_;
  const std::string message_;
  const std::optional<std::string> stack_;
};

facebook::jsi::Value makeSerializableError(
    facebook::jsi::Runtime &rt,
    const std::string &name,
    const std::string &message,
    const std::optional<std::string> &stack);

} // namespace worklets
