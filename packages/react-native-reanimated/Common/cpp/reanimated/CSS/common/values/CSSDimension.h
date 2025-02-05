#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/common/values/CSSValue.h>

#include <string>

namespace reanimated {

struct CSSDimension : public CSSResolvableValue<CSSDimension, double> {
  double value;
  bool isRelative;

  CSSDimension();
  explicit CSSDimension(double value);
  explicit CSSDimension(double value, bool isRelative);
  explicit CSSDimension(const std::string &value);
  explicit CSSDimension(jsi::Runtime &rt, const jsi::Value &jsiValue);

  static bool canConstruct(const std::string &value);
  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue);

  jsi::Value toJSIValue(jsi::Runtime &rt) const override;
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

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
