#pragma once

#include <reanimated/CSS/common/values/CSSValue.h>

#include <string>

namespace reanimated::css {

struct CSSLength : public CSSResolvableValue<CSSLength, double> {
  double value;
  bool isRelative;

  CSSLength();
  explicit CSSLength(double value);
  explicit CSSLength(double value, bool isRelative);
  explicit CSSLength(const char *value);
  explicit CSSLength(jsi::Runtime &rt, const jsi::Value &jsiValue);
  explicit CSSLength(const folly::dynamic &value);

  static bool canConstruct(const std::string &value);
  static bool canConstruct(const char *value);
  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue);
  static bool canConstruct(const folly::dynamic &value);

  folly::dynamic toDynamic() const override;
  std::string toString() const override;
  CSSLength interpolate(
      double progress,
      const CSSLength &to,
      const CSSResolvableValueInterpolationContext &context) const override;
  std::optional<double> resolve(
      const CSSResolvableValueInterpolationContext &context) const override;

  bool operator==(const CSSLength &other) const;

#ifndef NDEBUG
  friend std::ostream &operator<<(std::ostream &os, const CSSLength &dimension);
#endif // NDEBUG
};

} // namespace reanimated::css
