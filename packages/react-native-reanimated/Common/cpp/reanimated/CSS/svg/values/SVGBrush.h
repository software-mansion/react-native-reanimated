#pragma once

#include <reanimated/CSS/common/values/CSSColor.h>

#include <string>

namespace reanimated::css {

enum class SVGBrushType : std::uint8_t {
  Rgba,
  Transparent,
  CurrentColor,
};

struct SVGBrush : public CSSColorBase<SVGBrushType, SVGBrush> {
  using CSSColorBase<SVGBrushType, SVGBrush>::CSSColorBase;
  using CSSColorBase<SVGBrushType, SVGBrush>::operator==;

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

 private:
  static bool isValidColorString(const std::string &value);
};

} // namespace reanimated::css
