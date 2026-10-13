#pragma once

#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable/Serializable.h>

#include <memory>
#include <string>
#include <utility>
#include <vector>

namespace worklets {

class SerializableObject : public Serializable {
 public:
  SerializableObject(facebook::jsi::Runtime &rt, const facebook::jsi::Object &object);

  SerializableObject(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Object &object,
      const facebook::jsi::Value &nativeStateSource);

  facebook::jsi::Value toJSValue(facebook::jsi::Runtime &rt) override;

 protected:
  std::vector<std::pair<std::string, std::shared_ptr<Serializable>>> data_;
  std::shared_ptr<facebook::jsi::NativeState> nativeState_;
};

facebook::jsi::Value makeSerializableObject(
    facebook::jsi::Runtime &rt,
    facebook::jsi::Object object,
    bool shouldRetainRemote,
    const facebook::jsi::Value &nativeStateSource);

} // namespace worklets
