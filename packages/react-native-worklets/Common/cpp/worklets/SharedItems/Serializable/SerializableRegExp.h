#pragma once

#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable/Serializable.h>

#include <string>

namespace worklets {

class SerializableRegExp : public Serializable {
 public:
  SerializableRegExp(const std::string &pattern, const std::string &flags)
      : Serializable(ValueType::RegExpType), pattern_(pattern), flags_(flags) {}

  facebook::jsi::Value toJSValue(facebook::jsi::Runtime &rt) override;

 protected:
  const std::string pattern_;
  const std::string flags_;
};

facebook::jsi::Value
makeSerializableRegExp(facebook::jsi::Runtime &rt, const std::string &pattern, const std::string &flags);

} // namespace worklets
