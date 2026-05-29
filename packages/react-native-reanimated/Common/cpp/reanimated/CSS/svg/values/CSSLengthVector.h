#pragma once

#include <reanimated/CSS/common/values/CSSLength.h>

#include <string>
#include <vector>

namespace reanimated::css {

/*
 * Base for CSS values that hold a list of CSSLength values and interpolate
 * them element-wise. Concrete subclasses only implement `interpolate`, which
 * decides how the two lists are paired/resized before interpolating the
 * corresponding elements (e.g. nearest-neighbor resampling for CSSLengthArray,
 * least-common-multiple repetition for SVGStrokeDashArray).
 *
 * Each `Derived` must declare two static members used by `toString`:
 *   static constexpr char kOpenBracket;
 *   static constexpr char kCloseBracket;
 */
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

  bool operator==(const Derived &other) const;
};

} // namespace reanimated::css
