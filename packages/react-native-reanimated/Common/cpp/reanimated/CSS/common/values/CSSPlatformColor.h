#pragma once

#include <reanimated/CSS/common/values/CSSColor.h>
#include <reanimated/CSS/common/values/CSSValue.h>

#include <memory>
#include <string>

namespace reanimated::css {

/// A PlatformColor or DynamicColorIOS payload, kept unresolved so toDynamic()
/// hands it back to RN, which resolves it against the surface's own theme.
///
/// TODO: nothing resolves a payload yet, so this is resolvable in name only. It
/// is declared that way because blending needs the payload turned into channels
/// for the view being animated, and keyframes are shared by every view using an
/// animation - so the value cannot be resolved once and cached on the keyframe.
struct CSSPlatformColor : public CSSResolvableValue<CSSPlatformColor, ValueInterpolationContext> {
  std::shared_ptr<const folly::dynamic> payload;

  CSSPlatformColor() = default;
  explicit CSSPlatformColor(const folly::dynamic &value);
  explicit CSSPlatformColor(jsi::Runtime &rt, const jsi::Value &jsiValue);

  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue);
  static bool canConstruct(const folly::dynamic &value);

  folly::dynamic toDynamic() const override;
  std::string toString() const override;

  bool canInterpolateTo(const CSSPlatformColor &to) const override;
  CSSPlatformColor interpolate(double progress, const CSSPlatformColor &to, const ValueInterpolationContext &context)
      const override;

  bool operator==(const CSSPlatformColor &other) const;

#ifndef NDEBUG
  friend std::ostream &operator<<(std::ostream &os, const CSSPlatformColor &color);
#endif // NDEBUG
};

} // namespace reanimated::css
