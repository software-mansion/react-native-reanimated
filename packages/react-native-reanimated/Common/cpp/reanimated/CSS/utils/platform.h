#pragma once

#include <reanimated/CSS/easing/EasingConfigs.h>
#include <reanimated/NativeAnimations/NativeAnimationTypes.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>

#include <optional>
#include <string>
#include <utility>
#include <variant>

namespace reanimated::css {

/// CSS keeps this compatibility name while its parser produces the shared,
/// owned value type. The value has no JSI or platform object after parsing.
using PlatformValue = native_animation::AnimationValue;

/// Whether the property can animate natively for the given easing. Every backend
/// needs an easing its interpolators can carry, and each platform routes its own
/// subset of properties; everything else runs on the C++ loop.
bool canRouteCSSProperty(const std::string &propertyName, const EasingConfig &easing);

/// Parses a transition's endpoints, looking the property up once. Null/undefined
/// falls back to its CSS default; nullopt means the platform can't express the
/// pair, so it runs on the loop. jsi::Value is the config path, folly::dynamic the
/// pseudo-selector toggle path.
using PlatformValuePair = std::pair<PlatformValue, PlatformValue>;

std::optional<PlatformValuePair> parsePlatformValues(
    facebook::jsi::Runtime &rt,
    const std::string &propertyName,
    const facebook::jsi::Value &fromValue,
    const facebook::jsi::Value &toValue);
std::optional<PlatformValuePair>
parsePlatformValues(const std::string &propertyName, const folly::dynamic &fromValue, const folly::dynamic &toValue);

} // namespace reanimated::css
