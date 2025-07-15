#pragma once

#include <reanimated/CSS/interpolation/PropertyInterpolator.h>

// react-native style props interpolators
#include <reanimated/CSS/config/props/base/image.h>
#include <reanimated/CSS/config/props/base/text.h>
#include <reanimated/CSS/config/props/base/view.h>
// react-native-svg style props interpolators
#include <reanimated/CSS/config/props/svg/circle.h>
#include <reanimated/CSS/config/props/svg/path.h>

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
