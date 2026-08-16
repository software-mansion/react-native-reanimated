#include <reanimated/CSS/utils/platform.h>
#include <reanimated/CSS/utils/props.h>
#include <reanimated/Tools/FeatureFlags.h>

#include <array>
#include <cstdint>
#include <type_traits>
#include <unordered_map>
#include <variant>

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
  constexpr std::array<double, 4> kTransparentColor = {0, 0, 0, 0};
  constexpr std::array<double, 4> kBlackColor = {0, 0, 0, 1};
  static const std::unordered_map<std::string, CSSPropertyTraits> kProperties = {
      {"opacity", {CSSValueKind::Scalar, 1.0}},
      {"backgroundColor", {CSSValueKind::Color, kTransparentColor}},
      {"borderColor", {CSSValueKind::Color, kBlackColor}},
      {"borderRadius", {CSSValueKind::Scalar, 0.0}},
      {"borderWidth", {CSSValueKind::Scalar, 0.0}},
      {"shadowColor", {CSSValueKind::Color, kBlackColor}},
      {"shadowOpacity", {CSSValueKind::Scalar, 1.0}},
      {"shadowRadius", {CSSValueKind::Scalar, 0.0}},
      {"shadowOffset", {CSSValueKind::Size, std::array<double, 2>{0.0, 0.0}}},
  };
  const auto it = kProperties.find(propertyName);
  return it != kProperties.end() ? &it->second : nullptr;
}

// RN's processColor encodes named colors and rgba() strings as a packed ARGB
// number; PlatformColor-like objects are not expressible.
PlatformValue parseColorNumber(const double number) {
  const auto channels = extractColorChannels(static_cast<int64_t>(number));
  return std::array<double, 4>{
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
      return std::array<double, 2>{
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
      return std::array<double, 2>{
          width != nullptr && width->isNumber() ? width->asDouble() : 0.0,
          height != nullptr && height->isNumber() ? height->asDouble() : 0.0,
      };
    }
  }
  return std::nullopt;
}

// A color endpoint that is only there because the property is unset carries no hue
// of its own, so CSSColor::interpolate fades the other endpoint's hue out instead of
// sliding through black. The platform backends interpolate the raw channels, so the
// substitution has to happen here for them to match the loop.
void applyTransparentEndpointRule(
    const CSSPropertyTraits &traits,
    const bool fromIsUnset,
    const bool toIsUnset,
    PlatformValue &from,
    PlatformValue &to) {
  if (traits.kind != CSSValueKind::Color) {
    return;
  }
  auto *fromChannels = std::get_if<std::array<double, 4>>(&from);
  auto *toChannels = std::get_if<std::array<double, 4>>(&to);
  if (fromChannels == nullptr || toChannels == nullptr) {
    return;
  }
  if (fromIsUnset) {
    *fromChannels = {(*toChannels)[0], (*toChannels)[1], (*toChannels)[2], 0.0};
  } else if (toIsUnset) {
    *toChannels = {(*fromChannels)[0], (*fromChannels)[1], (*fromChannels)[2], 0.0};
  }
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

std::optional<PlatformValue>
lerpPlatformValues(const PlatformValue &from, const PlatformValue &to, const double progress) {
  const auto lerp = [progress](const double start, const double end) {
    return start + (end - start) * progress;
  };
  return std::visit(
      [&lerp](const auto &fromValue, const auto &toValue) -> std::optional<PlatformValue> {
        using Kind = std::decay_t<decltype(fromValue)>;
        if constexpr (!std::is_same_v<Kind, std::decay_t<decltype(toValue)>>) {
          return std::nullopt;
        } else if constexpr (std::is_same_v<Kind, double>) {
          return lerp(fromValue, toValue);
        } else {
          Kind blended{};
          for (size_t i = 0; i < blended.size(); ++i) {
            blended[i] = lerp(fromValue[i], toValue[i]);
          }
          return blended;
        }
      },
      from,
      to);
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
  auto from = parseValue(*traits, rt, fromValue);
  auto to = parseValue(*traits, rt, toValue);
  if (!from || !to) {
    return std::nullopt;
  }
  applyTransparentEndpointRule(
      *traits, fromValue.isNull() || fromValue.isUndefined(), toValue.isNull() || toValue.isUndefined(), *from, *to);
  return PlatformValuePair{*from, *to};
}

std::optional<PlatformValuePair>
parsePlatformValues(const std::string &propertyName, const folly::dynamic &fromValue, const folly::dynamic &toValue) {
  const auto *traits = traitsFor(propertyName);
  if (traits == nullptr) {
    return std::nullopt;
  }
  auto from = parseValue(*traits, fromValue);
  auto to = parseValue(*traits, toValue);
  if (!from || !to) {
    return std::nullopt;
  }
  applyTransparentEndpointRule(*traits, fromValue.isNull(), toValue.isNull(), *from, *to);
  return PlatformValuePair{*from, *to};
}

} // namespace reanimated::css
