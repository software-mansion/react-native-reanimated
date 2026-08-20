#pragma once

#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable/Serializable.h>

#include <string>

namespace worklets {

class SerializableString : public Serializable {
 public:
  explicit SerializableString(const std::string &string) : Serializable(ValueType::StringType), data_(string) {}

  facebook::jsi::Value toJSValue(facebook::jsi::Runtime &rt) override;

 protected:
  const std::string data_;
};

facebook::jsi::Value makeSerializableString(facebook::jsi::Runtime &rt, const facebook::jsi::String &string);

} // namespace worklets
