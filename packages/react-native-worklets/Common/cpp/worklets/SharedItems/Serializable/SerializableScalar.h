#pragma once

#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable/Serializable.h>

#include <cstddef>

namespace worklets {

class SerializableScalar : public Serializable {
 public:
  explicit SerializableScalar(double number) : Serializable(ValueType::NumberType) {
    data_.number = number;
  }
  explicit SerializableScalar(bool boolean) : Serializable(ValueType::BooleanType) {
    data_.boolean = boolean;
  }
  SerializableScalar() : Serializable(ValueType::UndefinedType) {}
  explicit SerializableScalar(std::nullptr_t) : Serializable(ValueType::NullType) {}

  facebook::jsi::Value toJSValue(facebook::jsi::Runtime &) override;

 protected:
  union Data {
    bool boolean;
    double number;
  };

 private:
  Data data_;
};

facebook::jsi::Value makeSerializableNumber(facebook::jsi::Runtime &rt, double number);

facebook::jsi::Value makeSerializableBoolean(facebook::jsi::Runtime &rt, bool boolean);

facebook::jsi::Value makeSerializableUndefined(facebook::jsi::Runtime &rt);

facebook::jsi::Value makeSerializableNull(facebook::jsi::Runtime &rt);

} // namespace worklets
