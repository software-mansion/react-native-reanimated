#pragma once

#include <reanimated/CSS/values/base/CSSDimension.h>

#include <numeric>
#include <string>
#include <vector>

namespace reanimated::css {

// TODO - change this to a CSSResolvableValue once we figure out how to
// get a proper scaled viewport size (for now this is impossible and the
// frame size that we can get from the ShadowNode doesn't contain valid values)
struct CSSStrokeDashArray : public CSSSimpleValue<CSSStrokeDashArray> {
  std::vector<CSSDimension> values;

  CSSStrokeDashArray();
  explicit CSSStrokeDashArray(const std::vector<CSSDimension> &values);
  explicit CSSStrokeDashArray(jsi::Runtime &rt, const jsi::Value &jsiValue);
  explicit CSSStrokeDashArray(const folly::dynamic &value);

  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue);
  static bool canConstruct(const folly::dynamic &value);

  folly::dynamic toDynamic() const override;
  std::string toString() const override;
  CSSStrokeDashArray interpolate(double progress, const CSSStrokeDashArray &to)
      const override;

  bool operator==(const CSSStrokeDashArray &other) const;

#ifndef NDEBUG
  friend std::ostream &operator<<(
      std::ostream &os,
      const CSSStrokeDashArray &strokeDashArray);
#endif // NDEBUG
};

} // namespace reanimated::css
