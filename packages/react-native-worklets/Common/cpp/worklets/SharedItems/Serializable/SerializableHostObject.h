#pragma once

#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable/Serializable.h>

#include <memory>

namespace worklets {

class SerializableHostObject : public Serializable {
 public:
  SerializableHostObject(facebook::jsi::Runtime &, const std::shared_ptr<facebook::jsi::HostObject> &hostObject)
      : Serializable(ValueType::HostObjectType), hostObject_(hostObject) {}

  facebook::jsi::Value toJSValue(facebook::jsi::Runtime &rt) override;

 protected:
  const std::shared_ptr<facebook::jsi::HostObject> hostObject_;
};

facebook::jsi::Value makeSerializableHostObject(
    facebook::jsi::Runtime &rt,
    const std::shared_ptr<facebook::jsi::HostObject> &value);

} // namespace worklets
