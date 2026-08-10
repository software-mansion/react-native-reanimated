#pragma once

#include <reanimated/CSS/common/values/CSSLength.h>

#include <string>
#include <vector>

namespace reanimated::css {

template <typename Derived>
struct CSSLengthVector : public CSSResolvableValue<Derived> {
  std::vector<CSSLength> values;

  CSSLengthVector() = default;
  explicit CSSLengthVector(std::vector<CSSLength> values);
  explicit CSSLengthVector(jsi::Runtime &rt, const jsi::Value &jsiValue);
  explicit CSSLengthVector(const folly::dynamic &value);

  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue);
  static bool canConstruct(const folly::dynamic &value);

  folly::dynamic toDynamic() const override;
  std::string toString() const override;

  bool operator==(const CSSLengthVector &other) const;
};

} // namespace reanimated::css
