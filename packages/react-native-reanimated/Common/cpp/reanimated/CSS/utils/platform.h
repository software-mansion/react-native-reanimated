#pragma once

#include <reanimated/CSS/easing/EasingConfigs.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>

#include <array>
#include <optional>
#include <string>
#include <utility>
#include <variant>

namespace reanimated::css {

/// The value kinds the platform can animate natively: scalars, sizes, and RGBA
/// colors (normalized to [0, 1]).
using PlatformValue = std::variant<double, std::array<double, 2>, std::array<double, 4>>;

/// Whether the property can animate natively for the given easing. Every backend
/// needs an easing its interpolators can carry, and each platform routes its own
/// subset of properties; everything else runs on the C++ loop.
bool canRouteCSSProperty(const std::string &propertyName, const EasingConfig &easing);

std::optional<PlatformValue> lerpPlatformValues(const PlatformValue &from, const PlatformValue &to, double progress);

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
