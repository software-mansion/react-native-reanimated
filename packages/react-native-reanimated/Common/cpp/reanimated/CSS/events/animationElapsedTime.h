#pragma once

#include <reanimated/CSS/progress/AnimationProgressProvider.h>

namespace reanimated::css {

/// `elapsedTime` carried by each CSS animation event, in milliseconds. Kept
/// free of the animation so the spec formulas can be exercised on their own.

double animationStartElapsedTime(const AnimationProgressProvider &provider);
double animationIterationElapsedTime(const AnimationProgressProvider &provider);
double animationEndElapsedTime(const AnimationProgressProvider &provider);
double animationCancelElapsedTime(const AnimationProgressProvider &provider, double cancelTimestamp);

} // namespace reanimated::css
