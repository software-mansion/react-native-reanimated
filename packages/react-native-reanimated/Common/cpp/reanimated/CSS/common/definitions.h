#pragma once

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <string>
#include <unordered_set>
#include <vector>

namespace reanimated::css {

using namespace facebook;

using PropertyPath = std::vector<std::string>;
using TransitionProperties = std::unordered_set<std::string>;

using EasingFunction = std::function<double(double)>;
using ColorChannels = std::array<uint8_t, 4>;

} // namespace reanimated::css
