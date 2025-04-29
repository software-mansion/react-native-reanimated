#pragma once

#include <reanimated/CSS/common/definitions.h>

#include <folly/dynamic.h>

namespace reanimated::css {

double sampleCurveX(double t, double x1, double x2);
double sampleCurveY(double t, double y1, double y2);
double sampleCurveDerivativeX(double t, double x1, double x2);
double solveCurveX(double x, double x1, double x2, double epsilon = 1e-6);

EasingFunction cubicBezier(double x1, double y1, double x2, double y2);
EasingFunction cubicBezier(const folly::dynamic &easingConfig);

} // namespace reanimated::css
