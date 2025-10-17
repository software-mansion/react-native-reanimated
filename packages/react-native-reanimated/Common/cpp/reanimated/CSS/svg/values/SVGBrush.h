#pragma once

#include <reanimated/CSS/common/values/CSSColor.h>

#include <string>
namespace reanimated::css {

enum class SVGBrushType {
  Rgba = 0,
  Transparent = 1,
  CurrentColor = 2,
  UrlId = 3,
  ContextFill = 4,
  ContextStroke = 5,
};

struct SVGBrush : public CSSColorBase<SVGBrushType, SVGBrush> {
  using CSSColorBase<SVGBrushType, SVGBrush>::CSSColorBase;
  using CSSColorBase<SVGBrushType, SVGBrush>::canConstruct;
  using CSSColorBase<SVGBrushType, SVGBrush>::operator==;

  explicit SVGBrush(jsi::Runtime &rt, const jsi::Value &jsiValue);
  explicit SVGBrush(const folly::dynamic &value);

  folly::dynamic toDynamic() const override;
  std::string toString() const override;

  SVGBrush interpolate(double progress, const SVGBrush &to) const override;
  bool isInterpolatable() const;

#ifndef NDEBUG
  friend std::ostream &operator<<(std::ostream &os, const SVGBrush &colorValue);
#endif // NDEBUG
};

} // namespace reanimated::css
