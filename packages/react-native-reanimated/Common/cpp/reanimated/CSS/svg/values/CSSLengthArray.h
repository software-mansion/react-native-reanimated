#pragma once

#include <reanimated/CSS/common/values/CSSLength.h>

#include <concepts>
#include <string>
#include <utility>
#include <vector>

namespace reanimated::css {

// TODO:
// This class can be changed into a template in the future
// Then it can be also used for interpolating the SVGStops
struct CSSLengthArray : public CSSResolvableValue<CSSLengthArray> {

  CSSLengthArray() = default;
  explicit CSSLengthArray(CSSLength singleValue) : lengths{std::move(singleValue)} {}
  template <typename T>
    requires(!std::same_as<std::decay_t<T>, CSSLengthArray>) && std::constructible_from<std::vector<CSSLength>, T>
  explicit CSSLengthArray(T &&value) : lengths{std::forward<T>(value)} {}
  explicit CSSLengthArray(jsi::Runtime &rt, const jsi::Value &jsiValue);
  explicit CSSLengthArray(const folly::dynamic &value);

  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue);
  static bool canConstruct(const folly::dynamic &value);

  folly::dynamic toDynamic() const override;
  std::string toString() const override;
  CSSLengthArray interpolate(
      double progress,
      const CSSLengthArray &to,
      const ResolvableValueInterpolationContext &context) const override;

  bool operator==(const CSSLengthArray &other) const;

#ifndef NDEBUG
  friend std::ostream &operator<<(std::ostream &os, const CSSLengthArray &dimension);
#endif // NDEBUG

 private:
  std::vector<CSSLength> lengths;
};

} // namespace reanimated::css
