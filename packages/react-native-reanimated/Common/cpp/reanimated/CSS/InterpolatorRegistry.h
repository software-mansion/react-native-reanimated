#pragma once

#include <reanimated/CSS/interpolation/PropertyInterpolator.h>

#include <string>
#include <unordered_map>

namespace reanimated::css {

using ComponentInterpolatorsMap = std::unordered_map<std::string, InterpolatorFactoriesRecord>;

const InterpolatorFactoriesRecord &getComponentInterpolators(const std::string &nativeComponentName);

void registerComponentInterpolators(
    const std::string &nativeComponentName,
    const InterpolatorFactoriesRecord &interpolators);

} // namespace reanimated::css
