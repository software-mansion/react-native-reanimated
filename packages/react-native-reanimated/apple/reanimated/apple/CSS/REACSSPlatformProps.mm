#import <reanimated/apple/CSS/REACSSPlatformProps.h>

#import <reanimated/CSS/utils/props.h>
#import <reanimated/Tools/FeatureFlags.h>

#import <array>
#import <cstdint>
#import <string>
#import <unordered_map>
#import <variant>

namespace reanimated::css {

namespace {

// Defined here with the rest of the parse machinery; first consumed once color
// properties join the catalog, hence [[maybe_unused]] for the earlier subset.
[[maybe_unused]] constexpr std::array<double, 4> kTransparentColor = {0, 0, 0, 0};
[[maybe_unused]] constexpr std::array<double, 4> kBlackColor = {0, 0, 0, 1};

enum class CSSValueKind : std::uint8_t { Scalar, Color, Size };

struct CSSPropertyTraits {
  CSSValueKind kind;
  // CSS-spec default applied when an endpoint is null.
  PlatformValue defaultValue;
};

// The natively animatable properties: each one's value kind and CSS default
// (mirrors InterpolatorRegistry.cpp). Grows as more properties are routed.
const CSSPropertyTraits *traitsFor(const std::string &propertyName)
{
  static const std::unordered_map<std::string, CSSPropertyTraits> kProperties = {
      {"opacity", {CSSValueKind::Scalar, 1.0}},
  };
  const auto it = kProperties.find(propertyName);
  return it != kProperties.end() ? &it->second : nullptr;
}

// RN's processColor encodes named colors and rgba() strings as a packed ARGB
// number; PlatformColor-like objects are not expressible.
PlatformValue parseColorNumber(const double number)
{
  const auto channels = extractColorChannels(static_cast<int64_t>(number));
  return std::array<double, 4>{
      channels[0] / 255.0,
      channels[1] / 255.0,
      channels[2] / 255.0,
      channels[3] / 255.0,
  };
}

// CALayer's CGColor needs a colorspace; cache the sRGB reference.
CGColorSpaceRef sharedSRGBColorSpace()
{
  static CGColorSpaceRef space = nullptr;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{ space = CGColorSpaceCreateWithName(kCGColorSpaceSRGB); });
  return space;
}

} // namespace

bool canRouteCSSProperty(
    const std::string &propertyName,
    const EasingConfig &easing,
    const facebook::react::ShadowNode & /*shadowNode*/,
    const std::unordered_set<std::string> & /*transitioningProperties*/)
{
  if constexpr (!StaticFeatureFlags::getFlag("IOS_CSS_CORE_ANIMATION")) {
    return false;
  }
  if (traitsFor(propertyName) == nullptr) {
    return false;
  }
  // CAMediaTimingFunction can express only linear and cubic-bezier curves;
  // steps / linear-stops easings have to interpolate per-frame on the loop.
  return std::holds_alternative<LinearEasing>(easing) || std::holds_alternative<CubicBezierEasing>(easing);
}

std::optional<PlatformValue> parsePlatformValue(const std::string &propertyName, const CSSEndpointValue &value)
{
  const auto *traits = traitsFor(propertyName);
  if (traits == nullptr) {
    return std::nullopt;
  }
  if (std::holds_alternative<std::monostate>(value)) {
    return traits->defaultValue;
  }
  if (traits->kind == CSSValueKind::Scalar) {
    const auto *number = std::get_if<double>(&value);
    return number ? std::optional<PlatformValue>(*number) : std::nullopt;
  }
  if (traits->kind == CSSValueKind::Color) {
    const auto *number = std::get_if<double>(&value);
    return number ? std::optional<PlatformValue>(parseColorNumber(*number)) : std::nullopt;
  }
  // CSSValueKind::Size
  const auto *size = std::get_if<std::array<double, 2>>(&value);
  return size ? std::optional<PlatformValue>(*size) : std::nullopt;
}

id idFromPlatformValue(const PlatformValue &value)
{
  if (const auto *scalar = std::get_if<double>(&value)) {
    return @(*scalar);
  }
  if (const auto *size = std::get_if<std::array<double, 2>>(&value)) {
    return [NSValue valueWithCGSize:CGSizeMake((*size)[0], (*size)[1])];
  }
  const auto &color = std::get<std::array<double, 4>>(value);
  const CGFloat components[4] = {color[0], color[1], color[2], color[3]};
  // CGColorCreate returns +1 retained; __bridge_transfer hands the retain to ARC.
  return (__bridge_transfer id)CGColorCreate(sharedSRGBColorSpace(), components);
}

CAMediaTimingFunction *makeCSSTimingFunction(const EasingConfig &easing)
{
  if (std::holds_alternative<CubicBezierEasing>(easing)) {
    const auto &cb = std::get<CubicBezierEasing>(easing);
    return [CAMediaTimingFunction functionWithControlPoints:(float)cb.x1:(float)cb.y1:(float)cb.x2:(float)cb.y2];
  }
  return [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionLinear];
}

} // namespace reanimated::css
