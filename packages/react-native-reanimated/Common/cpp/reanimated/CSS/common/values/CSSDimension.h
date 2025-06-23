#pragma once

#include <reanimated/CSS/common/values/CSSValue.h>

#include <string>

namespace reanimated::css {

struct CSSDimension : public CSSResolvableValue<CSSDimension, double> {
  double value;
  bool isRelative;

  CSSDimension();
  explicit CSSDimension(double value);
  explicit CSSDimension(double value, bool isRelative);
  explicit CSSDimension(const char *value);
  explicit CSSDimension(jsi::Runtime &rt, const jsi::Value &jsiValue);
  explicit CSSDimension(const folly::dynamic &value);

  static bool canConstruct(const std::string &value);
  static bool canConstruct(const char *value);
  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue);
  static bool canConstruct(const folly::dynamic &value);

  folly::dynamic toDynamic() const override;
  std::string toString() const override;
  CSSDimension interpolate(
      double progress,
      const CSSDimension &to,
      const CSSResolvableValueInterpolationContext &context) const override;
  std::optional<double> resolve(
      const CSSResolvableValueInterpolationContext &context) const override;

  bool operator==(const CSSDimension &other) const;

#ifndef NDEBUG
  friend std::ostream &operator<<(
      std::ostream &os,
      const CSSDimension &dimension);
#endif // NDEBUG
};

} // namespace reanimated::css
