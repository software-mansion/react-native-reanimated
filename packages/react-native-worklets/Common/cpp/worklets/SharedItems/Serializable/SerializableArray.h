#pragma once

#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable/Serializable.h>

#include <memory>
#include <vector>

namespace worklets {

class SerializableArray : public Serializable {
 public:
  SerializableArray(facebook::jsi::Runtime &rt, const facebook::jsi::Array &array);

  facebook::jsi::Value toJSValue(facebook::jsi::Runtime &rt) override;

  std::vector<facebook::jsi::Value> getJSIValueArr(facebook::jsi::Runtime &rt) {
    std::vector<facebook::jsi::Value> args;
    args.reserve(data_.size());
    for (const auto &item : data_) {
      args.push_back(item->toJSValue(rt));
    }
    return args;
  }

  [[nodiscard]] const std::vector<std::shared_ptr<Serializable>> &getList() const {
    return data_;
  }

 protected:
  std::vector<std::shared_ptr<Serializable>> data_;
};

facebook::jsi::Value makeSerializableArray(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Array &array,
    const facebook::jsi::Value &shouldRetainRemote);

} // namespace worklets
