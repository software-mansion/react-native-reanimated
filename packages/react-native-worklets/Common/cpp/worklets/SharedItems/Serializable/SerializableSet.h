#pragma once

#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable/Serializable.h>

#include <memory>
#include <vector>

namespace worklets {

class SerializableSet : public Serializable {
 public:
  SerializableSet(facebook::jsi::Runtime &rt, const facebook::jsi::Array &values);

  facebook::jsi::Value toJSValue(facebook::jsi::Runtime &rt) override;

 protected:
  std::vector<std::shared_ptr<Serializable>> data_;
};

facebook::jsi::Value makeSerializableSet(facebook::jsi::Runtime &rt, const facebook::jsi::Array &values);

} // namespace worklets
