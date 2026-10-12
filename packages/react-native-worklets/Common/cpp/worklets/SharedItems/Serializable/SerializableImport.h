#pragma once

#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable/Serializable.h>

#include <string>

namespace worklets {

class SerializableImport : public Serializable {
 public:
  SerializableImport(facebook::jsi::Runtime &rt, const double source, const facebook::jsi::String &imported)
      : Serializable(ValueType::ImportType), source_(source), imported_(imported.utf8(rt)) {}

  facebook::jsi::Value toJSValue(facebook::jsi::Runtime &rt) override;

 protected:
  const double source_;
  const std::string imported_;
};

facebook::jsi::Value
makeSerializableImport(facebook::jsi::Runtime &rt, double source, const facebook::jsi::String &imported);

} // namespace worklets
