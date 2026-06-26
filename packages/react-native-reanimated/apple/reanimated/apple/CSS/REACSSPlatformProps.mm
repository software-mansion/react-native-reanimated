#import <reanimated/apple/CSS/REACSSPlatformProps.h>

#import <array>
#import <string>
#import <variant>

namespace reanimated::css {

namespace {

// CALayer's CGColor needs a colorspace; cache the sRGB reference.
CGColorSpaceRef sharedSRGBColorSpace()
{
  static CGColorSpaceRef space = nullptr;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{ space = CGColorSpaceCreateWithName(kCGColorSpaceSRGB); });
  return space;
}

} // namespace

id idFromPlatformValue(const PlatformValue &value)
{
  if (const auto *scalar = std::get_if<double>(&value)) {
    return @(*scalar);
  }
  if (const auto *size = std::get_if<std::array<double, 2>>(&value)) {
    // +[NSValue valueWithCGSize:] is UIKit-only; AppKit boxes the same CGSize via valueWithSize:.
#if TARGET_OS_OSX
    return [NSValue valueWithSize:NSMakeSize((*size)[0], (*size)[1])];
#else
    return [NSValue valueWithCGSize:CGSizeMake((*size)[0], (*size)[1])];
#endif
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

NSString *caLayerKeyPathForCSSProperty(const std::string &propertyName)
{
  // CALayer names rounded corners "cornerRadius"; every other routed property maps
  // to its CALayer keyPath 1:1.
  if (propertyName == "borderRadius") {
    return @"cornerRadius";
  }
  return [NSString stringWithUTF8String:propertyName.c_str()];
}

} // namespace reanimated::css
