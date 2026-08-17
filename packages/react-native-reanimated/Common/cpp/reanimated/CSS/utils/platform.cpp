#include <reanimated/CSS/utils/platform.h>
#include <reanimated/CSS/utils/props.h>
#include <reanimated/Tools/FeatureFlags.h>

#include <cstdint>
#include <unordered_map>

namespace reanimated::css {

using namespace facebook;

namespace {

enum class CSSValueKind : std::uint8_t { Scalar, Color, Size };

struct CSSPropertyTraits {
  CSSValueKind kind;
  // CSS-spec default applied when an endpoint is null.
  PlatformValue defaultValue;
};

// Value kind and CSS default per property (mirrors InterpolatorRegistry.cpp).
// Which of them a platform actually routes is canRouteCSSProperty's decision.
const CSSPropertyTraits *traitsFor(const std::string &propertyName) {
  constexpr native_animation::AnimationColor kTransparentColor = {0, 0, 0, 0};
  constexpr native_animation::AnimationColor kBlackColor = {0, 0, 0, 1};
  static const std::unordered_map<std::string, CSSPropertyTraits> kProperties = {
      {"opacity", {CSSValueKind::Scalar, 1.0}},
      {"backgroundColor", {CSSValueKind::Color, kTransparentColor}},
      {"borderColor", {CSSValueKind::Color, kBlackColor}},
      {"borderRadius", {CSSValueKind::Scalar, 0.0}},
      {"borderWidth", {CSSValueKind::Scalar, 0.0}},
      {"shadowColor", {CSSValueKind::Color, kBlackColor}},
      {"shadowOpacity", {CSSValueKind::Scalar, 1.0}},
      {"shadowRadius", {CSSValueKind::Scalar, 0.0}},
      {"shadowOffset", {CSSValueKind::Size, native_animation::AnimationSize{0.0, 0.0}}},
  };
  const auto it = kProperties.find(propertyName);
  return it != kProperties.end() ? &it->second : nullptr;
}

// RN's processColor encodes named colors and rgba() strings as a packed ARGB
// number; PlatformColor-like objects are not expressible.
PlatformValue parseColorNumber(const double number) {
  const auto channels = extractColorChannels(static_cast<int64_t>(number));
  return native_animation::AnimationColor{
      channels[0] / 255.0,
      channels[1] / 255.0,
      channels[2] / 255.0,
      channels[3] / 255.0,
  };
}

std::optional<PlatformValue> parseValue(const CSSPropertyTraits &traits, jsi::Runtime &rt, const jsi::Value &value) {
  if (value.isNull() || value.isUndefined()) {
    return traits.defaultValue;
  }
  switch (traits.kind) {
    case CSSValueKind::Scalar:
      return value.isNumber() ? std::optional<PlatformValue>(value.asNumber()) : std::nullopt;
    case CSSValueKind::Color:
      return value.isNumber() ? std::optional<PlatformValue>(parseColorNumber(value.asNumber())) : std::nullopt;
    case CSSValueKind::Size: {
      if (!value.isObject()) {
        return std::nullopt;
      }
      const auto object = value.asObject(rt);
      const auto width = object.getProperty(rt, "width");
      const auto height = object.getProperty(rt, "height");
      return native_animation::AnimationSize{
          width.isNumber() ? width.asNumber() : 0.0,
          height.isNumber() ? height.asNumber() : 0.0,
      };
    }
  }
  return std::nullopt;
}

std::optional<PlatformValue> parseValue(const CSSPropertyTraits &traits, const folly::dynamic &value) {
  if (value.isNull()) {
    return traits.defaultValue;
  }
  switch (traits.kind) {
    case CSSValueKind::Scalar:
      return value.isNumber() ? std::optional<PlatformValue>(value.asDouble()) : std::nullopt;
    case CSSValueKind::Color:
      return value.isNumber() ? std::optional<PlatformValue>(parseColorNumber(value.asDouble())) : std::nullopt;
    case CSSValueKind::Size: {
      if (!value.isObject()) {
        return std::nullopt;
      }
      const auto *width = value.get_ptr("width");
      const auto *height = value.get_ptr("height");
      return native_animation::AnimationSize{
          width != nullptr && width->isNumber() ? width->asDouble() : 0.0,
          height != nullptr && height->isNumber() ? height->asDouble() : 0.0,
      };
    }
  }
  return std::nullopt;
}

} // namespace

bool canRouteCSSProperty(const std::string &propertyName, const EasingConfig &easing) {
#if __APPLE__
  if constexpr (!StaticFeatureFlags::getFlag("IOS_CSS_CORE_ANIMATION")) {
    return false;
  }
  if (traitsFor(propertyName) == nullptr) {
    return false;
  }
  // TODO: border props route unconditionally, but snap when RN rasterizes the
  // border (view fails useCoreAnimationBorderRendering); they should route only
  // when the platform can render them correctly (follow-up PR).
  // CAMediaTimingFunction can express only linear and cubic-bezier curves;
  // steps / linear-stops easings have to interpolate per-frame on the loop.
  return std::holds_alternative<LinearEasing>(easing) || std::holds_alternative<CubicBezierEasing>(easing);
#elif defined(ANDROID)
  if constexpr (!StaticFeatureFlags::getFlag("ANDROID_CSS_PLATFORM_TRANSITIONS")) {
    return false;
  }
  // Any TimeInterpolator can carry a curve, so every easing routes and this is unused.
  (void)easing;
  return propertyName == "opacity";
#else
  // No native routing backend on this platform yet; every property runs on the loop.
  return false;
#endif // __APPLE__
}

std::optional<PlatformValuePair> parsePlatformValues(
    jsi::Runtime &rt,
    const std::string &propertyName,
    const jsi::Value &fromValue,
    const jsi::Value &toValue) {
  const auto *traits = traitsFor(propertyName);
  if (traits == nullptr) {
    return std::nullopt;
  }
  const auto from = parseValue(*traits, rt, fromValue);
  const auto to = parseValue(*traits, rt, toValue);
  if (!from || !to) {
    return std::nullopt;
  }
  return PlatformValuePair{*from, *to};
}

std::optional<PlatformValuePair>
parsePlatformValues(const std::string &propertyName, const folly::dynamic &fromValue, const folly::dynamic &toValue) {
  const auto *traits = traitsFor(propertyName);
  if (traits == nullptr) {
    return std::nullopt;
  }
  const auto from = parseValue(*traits, fromValue);
  const auto to = parseValue(*traits, toValue);
  if (!from || !to) {
    return std::nullopt;
  }
  return PlatformValuePair{*from, *to};
}

} // namespace reanimated::css
