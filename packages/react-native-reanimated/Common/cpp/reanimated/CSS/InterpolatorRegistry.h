#pragma once

#include <reanimated/CSS/interpolation/PropertyInterpolator.h>

#include <string>
#include <unordered_map>

namespace reanimated::css {

using ComponentInterpolatorsMap =
    std::unordered_map<std::string, InterpolatorFactoriesRecord>;

const InterpolatorFactoriesRecord &getComponentInterpolators(
    const std::string &componentName);

void registerComponentInterpolators(
    const std::string &componentName,
    const InterpolatorFactoriesRecord &interpolators);

} // namespace reanimated::css
