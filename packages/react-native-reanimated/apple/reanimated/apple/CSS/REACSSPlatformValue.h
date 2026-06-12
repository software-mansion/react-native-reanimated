#pragma once

#import <array>
#import <variant>

namespace reanimated::css {

/// Values iOS Core Animation can express: scalars, width/height sizes and
/// RGBA colors (normalized [0, 1]).
using PlatformValue = std::variant<double, std::array<double, 2>, std::array<double, 4>>;

} // namespace reanimated::css
