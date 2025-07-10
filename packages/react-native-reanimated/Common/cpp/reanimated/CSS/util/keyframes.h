#pragma once

#include <folly/dynamic.h>
#include <utility>
#include <vector>

namespace reanimated::css {

std::vector<std::pair<double, folly::dynamic>> parseDynamicKeyframes(
    const folly::dynamic &keyframes);

} // namespace reanimated::css
