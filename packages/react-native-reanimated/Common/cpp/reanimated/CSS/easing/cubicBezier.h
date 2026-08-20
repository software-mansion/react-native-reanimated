#pragma once

#include <reanimated/CSS/common/definitions.h>

namespace reanimated::css {

double sampleCurveX(double t, double x1, double x2);
double sampleCurveY(double t, double y1, double y2);
double sampleCurveDerivativeX(double t, double x1, double x2);
/// Tolerance on x when inverting the curve; a single source of truth so the
/// declaration and the solver cannot disagree.
inline constexpr double kCubicBezierEpsilon = 1e-6;

double solveCurveX(double x, double x1, double x2, double epsilon = kCubicBezierEpsilon);

EasingFunction cubicBezier(double x1, double y1, double x2, double y2);
EasingFunction cubicBezier(jsi::Runtime &rt, const jsi::Object &easingConfig);

} // namespace reanimated::css
