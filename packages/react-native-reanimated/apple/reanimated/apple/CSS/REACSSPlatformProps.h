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

bool canRouteCSSProperty(const std::string &propertyName, const EasingConfig &easing);

/// Parses a transition endpoint into a platform value. Null/undefined falls back
/// to the property's CSS default; nullopt means it can't be animated natively and
/// runs on the loop. Two overloads: jsi::Value (config) and folly::dynamic (toggle).
std::optional<PlatformValue>
parsePlatformValue(facebook::jsi::Runtime &rt, const std::string &propertyName, const facebook::jsi::Value &value);
std::optional<PlatformValue> parsePlatformValue(const std::string &propertyName, const folly::dynamic &value);

id idFromPlatformValue(const PlatformValue &value);

CAMediaTimingFunction *makeCSSTimingFunction(const EasingConfig &easing);

} // namespace reanimated::css

NS_ASSUME_NONNULL_END
