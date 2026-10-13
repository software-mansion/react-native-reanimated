#pragma once

#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable/Serializable.h>

#include <string>

namespace worklets {

class SerializableHostFunction : public Serializable {
 public:
  SerializableHostFunction(
      const facebook::jsi::HostFunctionType &function,
      const std::string &name,
      unsigned int paramCount)
      : Serializable(ValueType::HostFunctionType), hostFunction_(function), name_(name), paramCount_(paramCount) {}

  facebook::jsi::Value toJSValue(facebook::jsi::Runtime &rt) override;

 protected:
  const facebook::jsi::HostFunctionType hostFunction_;
  const std::string name_;
  const unsigned int paramCount_;
};

facebook::jsi::Value makeSerializableHostFunction(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::HostFunctionType &function,
    const std::string &name,
    unsigned int paramCount);

} // namespace worklets
