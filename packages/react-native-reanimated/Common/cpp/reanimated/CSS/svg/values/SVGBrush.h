#pragma once

#include <reanimated/CSS/common/values/CSSColor.h>

namespace reanimated::css {

enum class SVGBrushType {
  Rgba = 0,
  Transparent = 1,
  CurrentColor = 2,
  UrlId = 3,
  ContextFill = 4,
  ContextStroke = 5,
};

class SVGBrush : public CSSColorBase<SVGBrushType, SVGBrush> {
  using CSSColorBase<SVGBrushType, SVGBrush>::CSSColorBase;

  explicit SVGBrush(jsi::Runtime &rt, const jsi::Value &jsiValue);
  explicit SVGBrush(const folly::dynamic &value);

  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue);
  static bool canConstruct(const folly::dynamic &value);

  folly::dynamic toDynamic() const override;
  std::string toString() const override;

  SVGBrush interpolate(double progress, const SVGBrush &to) const override;
  bool isInterpolatable() const;

#ifndef NDEBUG
  friend std::ostream &operator<<(std::ostream &os, const SVGBrush &colorValue);
#endif // NDEBUG
};

} // namespace reanimated::css
