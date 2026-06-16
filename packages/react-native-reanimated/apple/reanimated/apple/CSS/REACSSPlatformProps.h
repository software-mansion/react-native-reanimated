#pragma once

#import <reanimated/CSS/core/transition/CSSPlatformTransitionProxy.h>
#import <reanimated/CSS/easing/EasingConfigs.h>
#import <reanimated/apple/CSS/REACSSPlatformValue.h>

#import <react/renderer/core/ShadowNode.h>

#import <Foundation/Foundation.h>
#import <QuartzCore/QuartzCore.h>

#import <optional>
#import <string>
#import <unordered_set>

NS_ASSUME_NONNULL_BEGIN

namespace reanimated::css {

/// Whether Core Animation can drive the property natively. shadowNode carries
/// the view's latest committed props; transitioningProperties lists the
/// properties changing in the same pass.
bool canRouteCSSProperty(
    const std::string &propertyName,
    const EasingConfig &easing,
    const facebook::react::ShadowNode &shadowNode,
    const std::unordered_set<std::string> &transitioningProperties);

/// Parses an extracted endpoint into the platform value representation. An empty
/// (monostate) endpoint resolves to the property's CSS default; nullopt means the
/// value is not expressible natively and the property runs on the loop.
std::optional<PlatformValue> parsePlatformValue(const std::string &propertyName, const CSSEndpointValue &value);

/// Converts a parsed platform value to its Core Animation representation
/// (NSNumber, NSValue, or CGColor).
id idFromPlatformValue(const PlatformValue &value);

CAMediaTimingFunction *makeCSSTimingFunction(const EasingConfig &easing);

} // namespace reanimated::css

NS_ASSUME_NONNULL_END
