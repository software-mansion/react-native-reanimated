#pragma once

#include <reanimated/CSS/common/values/CSSColor.h>
#include <reanimated/CSS/common/values/CSSValue.h>

#include <memory>
#include <optional>
#include <string>

namespace reanimated::css {

/// A PlatformColor or DynamicColorIOS payload, kept unresolved so toDynamic()
/// hands it back to RN, which resolves it against the surface's own theme.
/// Interpolation resolves it per frame through resolve() instead - keyframes
/// are shared by every view using an animation, so a resolution cannot be
/// stored here.
struct CSSPlatformColor : public CSSResolvableValue<CSSPlatformColor, ValueInterpolationContext> {
  std::shared_ptr<const folly::dynamic> payload;

  CSSPlatformColor() = default;
  explicit CSSPlatformColor(const folly::dynamic &value);
  explicit CSSPlatformColor(jsi::Runtime &rt, const jsi::Value &jsiValue);

  static bool canConstruct(jsi::Runtime &rt, const jsi::Value &jsiValue);
  static bool canConstruct(const folly::dynamic &value);

  folly::dynamic toDynamic() const override;
  std::string toString() const override;

  /// The payload as a plain color, or nullopt where no platform resolver
  /// exists. CSSValueVariant calls this before interpolating, so the blend
  /// itself always happens between two plain colors.
  std::optional<CSSColor> resolve(const ValueInterpolationContext &context) const;

  CSSPlatformColor interpolate(double progress, const CSSPlatformColor &to, const ValueInterpolationContext &context)
      const override;

  bool operator==(const CSSPlatformColor &other) const;

#ifndef NDEBUG
  friend std::ostream &operator<<(std::ostream &os, const CSSPlatformColor &color);
#endif // NDEBUG
};

} // namespace reanimated::css
