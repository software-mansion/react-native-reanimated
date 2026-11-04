#pragma once

#include <reanimated/CSS/common/values/CSSPlatformColor.h>
#include <reanimated/CSS/common/values/CSSValue.h>

#include <string>

namespace reanimated::css {

struct SVGPlatformBrush : public CSSSimpleValue<SVGPlatformBrush> {
  CSSPlatformColor color;

  SVGPlatformBrush() = default;
  explicit SVGPlatformBrush(jsi::Runtime &rt, const jsi::Value &jsiValue);
  explicit SVGPlatformBrush(const folly::dynamic &value);

  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue);
  static bool canConstruct(const folly::dynamic &value);

  folly::dynamic toDynamic() const override;
  std::string toString() const override;

  bool canInterpolateTo(const SVGPlatformBrush &to) const override;
  SVGPlatformBrush interpolate(double progress, const SVGPlatformBrush &to) const override;

  bool operator==(const SVGPlatformBrush &other) const;

#ifndef NDEBUG
  friend std::ostream &operator<<(std::ostream &os, const SVGPlatformBrush &brush);
#endif // NDEBUG
};

} // namespace reanimated::css
