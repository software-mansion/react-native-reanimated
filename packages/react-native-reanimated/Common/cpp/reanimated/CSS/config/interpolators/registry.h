#pragma once

#include <reanimated/CSS/interpolation/PropertyInterpolator.h>

#include <reanimated/CSS/config/interpolators/base/image.h>
#include <reanimated/CSS/config/interpolators/base/text.h>
#include <reanimated/CSS/config/interpolators/base/view.h>

#include <stdexcept>
#include <string>
#include <unordered_map>
#include <utility>

namespace reanimated::css {

using ComponentInterpolatorsMap =
    std::unordered_map<std::string, InterpolatorFactoriesRecord>;

bool hasInterpolators(const std::string &componentName);

const InterpolatorFactoriesRecord &getComponentInterpolators(
    const std::string &componentName);

void registerComponentInterpolators(
    const std::string &componentName,
    const InterpolatorFactoriesRecord &interpolators);

} // namespace reanimated::css
