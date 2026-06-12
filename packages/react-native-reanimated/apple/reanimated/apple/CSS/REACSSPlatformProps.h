#pragma once

#import <reanimated/CSS/easing/EasingConfigs.h>
#import <reanimated/apple/CSS/REACSSPlatformValue.h>

#import <folly/dynamic.h>
#import <jsi/jsi.h>

#import <Foundation/Foundation.h>
#import <QuartzCore/QuartzCore.h>

#import <optional>
#import <string>

NS_ASSUME_NONNULL_BEGIN

namespace reanimated::css {

/// Whether Core Animation can drive the property natively for the given easing.
bool canRouteCSSProperty(const std::string &propertyName, const EasingConfig &easing);

/// Parses a transition endpoint into the platform value representation. A null /
/// undefined endpoint resolves to the property's CSS default; nullopt means the
/// value is not expressible natively and the property runs on the loop. One
/// overload per value source: jsi::Value (config path) and folly::dynamic (toggle).
std::optional<PlatformValue>
parsePlatformValue(facebook::jsi::Runtime &rt, const std::string &propertyName, const facebook::jsi::Value &value);
std::optional<PlatformValue> parsePlatformValue(const std::string &propertyName, const folly::dynamic &value);

/// Converts a parsed platform value to its Core Animation representation
/// (NSNumber, NSValue, or CGColor).
id idFromPlatformValue(const PlatformValue &value);

CAMediaTimingFunction *makeCSSTimingFunction(const EasingConfig &easing);

} // namespace reanimated::css

NS_ASSUME_NONNULL_END
