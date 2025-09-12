#pragma once

#include <reanimated/CSS/interpolation/PropertyInterpolator.h>

namespace reanimated::css {

const InterpolatorFactoriesRecord &getIOSTextInterpolators();
const InterpolatorFactoriesRecord &getAndroidTextInterpolators();
const InterpolatorFactoriesRecord &getTextInterpolators();

} // namespace reanimated::css
