#pragma once

#include <reanimated/CSS/interpolation/PropertyInterpolator.h>

#include <string>

namespace reanimated::css {

const InterpolatorFactoriesRecord &getComponentInterpolators(const std::string &nativeComponentName);

} // namespace reanimated::css
