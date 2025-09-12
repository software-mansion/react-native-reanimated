#pragma once

#include <reanimated/CSS/interpolation/PropertyInterpolator.h>

namespace reanimated::css {

const InterpolatorFactoriesRecord &getSvgColorInterpolators();
const InterpolatorFactoriesRecord &getSvgFillInterpolators();
const InterpolatorFactoriesRecord &getSvgStrokeInterpolators();
const InterpolatorFactoriesRecord &getSvgClipInterpolators();
const InterpolatorFactoriesRecord &getSvgTransformInterpolators();
const InterpolatorFactoriesRecord &getSvgCommonInterpolators();

} // namespace reanimated::css
