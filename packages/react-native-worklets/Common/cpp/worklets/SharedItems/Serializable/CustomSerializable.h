#pragma once

#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable/SerializableWorklet.h>

#include <memory>

namespace worklets {

facebook::jsi::Function getCustomSerializableUnpacker(facebook::jsi::Runtime &rt);

class CustomSerializable : public Serializable {
 public:
  CustomSerializable(std::shared_ptr<Serializable> data, const int typeId)
      : Serializable(ValueType::CustomType), data_(std::move(data)), typeId_(typeId) {}

  facebook::jsi::Value toJSValue(facebook::jsi::Runtime &rt) override;

 private:
  const std::shared_ptr<Serializable> data_;
  const int typeId_;
};

struct SerializationData {
  std::shared_ptr<SerializableWorklet> determine;
  std::shared_ptr<SerializableWorklet> pack;
  std::shared_ptr<SerializableWorklet> unpack;
  int typeId;
};

facebook::jsi::Value makeCustomSerializable(facebook::jsi::Runtime &rt, const facebook::jsi::Value &data, int typeId);

} // namespace worklets
