#pragma once

#include <reanimated/CSS/interpolation/PropertyInterpolator.h>

namespace reanimated::css {

const InterpolatorFactoriesRecord &getFlexInterpolators();
const InterpolatorFactoriesRecord &getIOSShadowInterpolators();
const InterpolatorFactoriesRecord &getTransformsInterpolators();

} // namespace reanimated::css
