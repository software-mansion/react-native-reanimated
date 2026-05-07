// Test-only shim: the real definitions.h pulls in <jsi/jsi.h> and
// <folly/dynamic.h>, but linear.cpp / steps.cpp / algorithms.cpp only need
// the EasingFunction typedef. Anything more would force us to vendor Hermes
// just to assert a four-line bug.
#pragma once

#include <array>
#include <cstdint>
#include <functional>
#include <string>
#include <unordered_set>
#include <vector>

namespace reanimated::css {

using PropertyPath = std::vector<std::string>;
using TransitionProperties = std::unordered_set<std::string>;
using EasingFunction = std::function<double(double)>;
using ColorChannels = std::array<uint8_t, 4>;

} // namespace reanimated::css
