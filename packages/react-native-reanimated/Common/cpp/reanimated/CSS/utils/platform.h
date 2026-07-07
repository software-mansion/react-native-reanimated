#pragma once

#include <reanimated/CSS/easing/EasingConfigs.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>

#include <array>
#include <optional>
#include <string>
#include <variant>

namespace reanimated::css {

/// The value kinds the platform can animate natively: scalars, sizes, and RGBA
/// colors (normalized to [0, 1]).
using PlatformValue = std::variant<double, std::array<double, 2>, std::array<double, 4>>;

/// Whether the property can animate natively for the given easing. Routing is
/// platform specific: platforms without a native backend (e.g. Android) never
/// route, so every property runs on the C++ loop.
bool canRouteCSSProperty(const std::string &propertyName, const EasingConfig &easing);

/// Parses a transition endpoint into a platform value. Null/undefined falls back
/// to the property's CSS default; nullopt means it can't be animated natively and
/// runs on the loop. Two overloads: jsi::Value (config) and folly::dynamic (toggle).
std::optional<PlatformValue>
parsePlatformValue(facebook::jsi::Runtime &rt, const std::string &propertyName, const facebook::jsi::Value &value);
std::optional<PlatformValue> parsePlatformValue(const std::string &propertyName, const folly::dynamic &value);

} // namespace reanimated::css
