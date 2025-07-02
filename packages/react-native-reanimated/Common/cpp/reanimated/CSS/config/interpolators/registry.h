#pragma once

#include <reanimated/CSS/interpolation/PropertyInterpolator.h>

#include <reanimated/CSS/config/interpolators/view.h>

#include <stdexcept>
#include <string>
#include <unordered_map>

namespace reanimated::css {

using ComponentInterpolatorsMap =
    std::unordered_map<std::string, InterpolatorFactoriesRecord>;

void registerInterpolators(
    const std::string &componentName,
    InterpolatorFactoriesRecord factories);

const InterpolatorFactoriesRecord &getInterpolators(
    const std::string &componentName);

} // namespace reanimated::css
