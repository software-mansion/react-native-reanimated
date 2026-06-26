#pragma once

#import <reanimated/CSS/easing/EasingConfigs.h>
#import <reanimated/CSS/utils/platform.h>

#import <Foundation/Foundation.h>
#import <QuartzCore/QuartzCore.h>

#import <string>

NS_ASSUME_NONNULL_BEGIN

namespace reanimated::css {

/// Converts a parsed platform value into the Obj-C object CALayer's KVC expects:
/// scalars to NSNumber, sizes to NSValue, colors to a CGColorRef.
id idFromPlatformValue(const PlatformValue &value);

CAMediaTimingFunction *makeCSSTimingFunction(const EasingConfig &easing);

NSString *caLayerKeyPathForCSSProperty(const std::string &propertyName);

} // namespace reanimated::css

NS_ASSUME_NONNULL_END
