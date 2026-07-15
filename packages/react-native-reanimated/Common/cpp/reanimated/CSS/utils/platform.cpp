#include <reanimated/CSS/utils/platform.h>

#if __APPLE__

#include <reanimated/CSS/utils/props.h>
#include <reanimated/Tools/FeatureFlags.h>

#include <array>
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

// The natively animatable properties: each one's value kind and CSS default
// (mirrors InterpolatorRegistry.cpp). Grows as more properties are routed.
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

} // namespace

bool canRouteCSSProperty(const std::string &propertyName, const EasingConfig &easing) {
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
}

std::optional<PlatformValue>
parsePlatformValue(jsi::Runtime &rt, const std::string &propertyName, const jsi::Value &value) {
  const auto *traits = traitsFor(propertyName);
  if (traits == nullptr) {
    return std::nullopt;
  }
  if (value.isNull() || value.isUndefined()) {
    return traits->defaultValue;
  }
  switch (traits->kind) {
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

std::optional<PlatformValue> parsePlatformValue(const std::string &propertyName, const folly::dynamic &value) {
  const auto *traits = traitsFor(propertyName);
  if (traits == nullptr) {
    return std::nullopt;
  }
  if (value.isNull()) {
    return traits->defaultValue;
  }
  switch (traits->kind) {
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

} // namespace reanimated::css

#else // !__APPLE__

namespace reanimated::css {

// No native routing backend on this platform yet; every property runs on the loop.
bool canRouteCSSProperty(const std::string &, const EasingConfig &) {
  return false;
}

std::optional<PlatformValue>
parsePlatformValue(facebook::jsi::Runtime &, const std::string &, const facebook::jsi::Value &) {
  return std::nullopt;
}

std::optional<PlatformValue> parsePlatformValue(const std::string &, const folly::dynamic &) {
  return std::nullopt;
}

} // namespace reanimated::css

#endif // __APPLE__
