#pragma once

#include <reanimated/CSS/common/values/CSSLength.h>

#include <numeric>
#include <string>
#include <vector>

namespace reanimated::css {

struct SVGStrokeDashArray : public CSSResolvableValue<SVGStrokeDashArray> {
  std::vector<CSSLength> values;

  SVGStrokeDashArray();
  explicit SVGStrokeDashArray(const std::vector<CSSLength> &values);
  explicit SVGStrokeDashArray(jsi::Runtime &rt, const jsi::Value &jsiValue);
  explicit SVGStrokeDashArray(const folly::dynamic &value);

  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue);
  static bool canConstruct(const folly::dynamic &value);

  folly::dynamic toDynamic() const override;
  std::string toString() const override;
  SVGStrokeDashArray interpolate(
      double progress,
      const SVGStrokeDashArray &to,
      const ResolvableValueInterpolationContext &context) const override;

  bool operator==(const SVGStrokeDashArray &other) const;

#ifndef NDEBUG
  friend std::ostream &operator<<(std::ostream &os, const SVGStrokeDashArray &strokeDashArray);
#endif // NDEBUG
};

} // namespace reanimated::css
