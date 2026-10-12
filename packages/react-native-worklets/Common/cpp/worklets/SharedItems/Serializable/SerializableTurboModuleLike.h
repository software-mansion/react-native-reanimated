#pragma once

#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable/SerializableHostObject.h>
#include <worklets/SharedItems/Serializable/SerializableObject.h>

#include <memory>

namespace worklets {

class SerializableTurboModuleLike : public Serializable {
 public:
  SerializableTurboModuleLike(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Object &object,
      const std::shared_ptr<facebook::jsi::HostObject> &proto)
      : Serializable(ValueType::TurboModuleLikeType),
        proto_(std::make_unique<SerializableHostObject>(rt, proto)),
        properties_(std::make_unique<SerializableObject>(rt, object)) {}

  facebook::jsi::Value toJSValue(facebook::jsi::Runtime &rt) override;

 private:
  const std::unique_ptr<SerializableHostObject> proto_;
  const std::unique_ptr<SerializableObject> properties_;
};

facebook::jsi::Value makeSerializableTurboModuleLike(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Object &object,
    const std::shared_ptr<facebook::jsi::HostObject> &proto);

} // namespace worklets
