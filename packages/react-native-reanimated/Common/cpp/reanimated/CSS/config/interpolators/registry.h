#pragma once

#include <reanimated/CSS/interpolation/InterpolatorFactory.h>

#include <stdexcept>
#include <string>
#include <string_view>
#include <unordered_map>

namespace reanimated::css {

using ComponentInterpolatorsMap =
    std::unordered_map<std::string, InterpolatorFactoriesRecord>;

void registerInterpolators(
    std::string_view componentName,
    InterpolatorFactoriesRecord factories);

const InterpolatorFactoriesRecord &getInterpolators(
    const std::string &componentName);

bool hasInterpolators(const std::string &componentName);

} // namespace reanimated::css
