#pragma once

#include <reanimated/CSS/common/values/CSSValue.h>
#include <reanimated/CSS/svg/values/SVGBrush.h>

#include <concepts>
#include <string>
#include <utility>
#include <vector>

namespace reanimated::css {

struct SVGStops : public CSSSimpleValue<SVGStops> {
  struct GradientStop {
    double offset;
    SVGBrush color;
  };

  SVGStops() = default;
  template <typename T>
    requires(!std::same_as<std::decay_t<T>, SVGStops>) && std::constructible_from<std::vector<GradientStop>, T>
  explicit SVGStops(T &&value) : stops{std::forward<T>(value)} {}
  explicit SVGStops(jsi::Runtime &rt, const jsi::Value &jsiValue);
  explicit SVGStops(const folly::dynamic &value);

  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue);
  static bool canConstruct(const folly::dynamic &value);

  folly::dynamic toDynamic() const override;
  std::string toString() const override;
  SVGStops interpolate(double progress, const SVGStops &to) const override;

  bool operator==(const SVGStops &other) const;

#ifndef NDEBUG
  friend std::ostream &operator<<(std::ostream &os, const SVGStops &dimension);
#endif // NDEBUG

 private:
  std::vector<GradientStop> stops;
};

} // namespace reanimated::css
