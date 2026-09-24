#pragma once

#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable/Serializable.h>

#include <cstdint>
#include <optional>
#include <string>

namespace worklets {

class SerializableBigInt : public Serializable {
 public:
  explicit SerializableBigInt(facebook::jsi::Runtime &rt, const facebook::jsi::BigInt &bigInt)
      : Serializable(ValueType::BigIntType) {
    if (bigInt.isInt64(rt)) {
      fastValue_ = bigInt.getInt64(rt);
    } else {
      slowValue_ = bigInt.toString(rt).utf8(rt);
    }
  }

  facebook::jsi::Value toJSValue(facebook::jsi::Runtime &rt) override;

 protected:
  /**
   * This member is used only when the BigInt fits into int64_t range.
   */
  std::optional<int64_t> fastValue_{};
  std::string slowValue_{};
};

facebook::jsi::Value makeSerializableBigInt(facebook::jsi::Runtime &rt, const facebook::jsi::BigInt &bigint);

} // namespace worklets
