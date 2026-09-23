#pragma once

#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable/SerializableObject.h>

namespace worklets {

class SerializableWorklet : public SerializableObject {
 public:
  SerializableWorklet(facebook::jsi::Runtime &rt, const facebook::jsi::Object &worklet)
      : SerializableObject(rt, worklet) {
    valueType_ = ValueType::WorkletType;
  }

  facebook::jsi::Value toJSValue(facebook::jsi::Runtime &rt) override;
};

facebook::jsi::Value makeSerializableWorklet(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Object &object,
    const bool &shouldRetainRemote);

} // namespace worklets
