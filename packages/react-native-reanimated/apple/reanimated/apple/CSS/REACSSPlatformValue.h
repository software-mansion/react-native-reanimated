#pragma once

#import <array>
#import <variant>

namespace reanimated::css {

// The value kinds Core Animation can animate: scalars, sizes, and RGBA colors
// (normalized to [0, 1]).
using PlatformValue = std::variant<double, std::array<double, 2>, std::array<double, 4>>;

} // namespace reanimated::css
