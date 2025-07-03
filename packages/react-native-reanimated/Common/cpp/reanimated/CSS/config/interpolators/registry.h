#pragma once

#include <reanimated/CSS/interpolation/PropertyInterpolator.h>

// react-native style props interpolators
#include <reanimated/CSS/config/interpolators/base/image.h>
#include <reanimated/CSS/config/interpolators/base/text.h>
#include <reanimated/CSS/config/interpolators/base/view.h>
// react-native-svg style props interpolators
#include <reanimated/CSS/config/interpolators/svg/circle.h>

#include <stdexcept>
#include <string>
#include <unordered_map>
#include <utility>

namespace reanimated::css {

using ComponentInterpolatorsMap =
    std::unordered_map<std::string, InterpolatorFactoriesRecord>;

bool hasInterpolators(const std::string &componentName);

const InterpolatorFactoriesRecord &getInterpolators(
    const std::string &componentName);

} // namespace reanimated::css
