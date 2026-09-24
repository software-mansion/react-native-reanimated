#pragma once

#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable/Serializable.h>

#include <memory>
#include <utility>
#include <vector>

namespace worklets {

class SerializableMap : public Serializable {
 public:
  SerializableMap(facebook::jsi::Runtime &rt, const facebook::jsi::Array &keys, const facebook::jsi::Array &values);

  facebook::jsi::Value toJSValue(facebook::jsi::Runtime &rt) override;

 protected:
  std::vector<std::pair<std::shared_ptr<Serializable>, std::shared_ptr<Serializable>>> data_;
};

facebook::jsi::Value
makeSerializableMap(facebook::jsi::Runtime &rt, const facebook::jsi::Array &keys, const facebook::jsi::Array &values);

} // namespace worklets
