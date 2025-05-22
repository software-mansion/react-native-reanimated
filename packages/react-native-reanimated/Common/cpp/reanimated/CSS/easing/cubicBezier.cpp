#include <reanimated/CSS/easing/cubicBezier.h>

namespace reanimated::css {

CubicBezierEasing::CubicBezierEasing(
    const double x1,
    const double y1,
    const double x2,
    const double y2)
    : x1_(x1), y1_(y1), x2_(x2), y2_(y2) {}

CubicBezierEasing::CubicBezierEasing(
    jsi::Runtime &rt,
    const jsi::Object &easingConfig)
    : x1_(easingConfig.getProperty(rt, "x1").asNumber()),
      y1_(easingConfig.getProperty(rt, "y1").asNumber()),
      x2_(easingConfig.getProperty(rt, "x2").asNumber()),
      y2_(easingConfig.getProperty(rt, "y2").asNumber()) {}

double CubicBezierEasing::sampleCurveX(const double t) const {
  return 3 * (1 - t) * (1 - t) * t * x1_ + 3 * (1 - t) * t * t * x2_ +
      t * t * t;
}

double CubicBezierEasing::sampleCurveY(const double t) const {
  return 3 * (1 - t) * (1 - t) * t * y1_ + 3 * (1 - t) * t * t * y2_ +
      t * t * t;
}

double CubicBezierEasing::sampleCurveDerivativeX(const double t) const {
  return -6 * (1 - t) * t * x1_ + 3 * (1 - t) * (1 - t) * x1_ +
      6 * (1 - t) * t * x2_ - 6 * t * t * x2_ + 3 * t * t;
}

double CubicBezierEasing::solveCurveX(const double x, const double epsilon)
    const {
  double t0 = 0.0, t1 = 1.0, t2 = x, xValue, dX;
  int iterations = 0;

  while (iterations < 8) {
    xValue = sampleCurveX(t2) - x;
    if (std::abs(xValue) < epsilon) {
      return t2;
    }
    dX = sampleCurveDerivativeX(t2);
    if (std::abs(dX) < epsilon) {
      break;
    }
    t2 = t2 - xValue / dX;
    iterations++;
  }

  // Fallback: Use binary search
  while (t0 < t1) {
    t2 = (t0 + t1) / 2.0;
    xValue = sampleCurveX(t2);
    if (std::abs(xValue - x) < epsilon) {
      return t2;
    }
    if (x > xValue) {
      t0 = t2;
    } else {
      t1 = t2;
    }
  }

  return t2;
}

double CubicBezierEasing::calculate(const double t) const {
  return sampleCurveY(solveCurveX(t));
}

bool CubicBezierEasing::operator==(
    const EasingBase<EasingType::CubicBezier> &other) const {
  const auto &otherCubic = static_cast<const CubicBezierEasing &>(other);
  return x1_ == otherCubic.x1_ && y1_ == otherCubic.y1_ &&
      x2_ == otherCubic.x2_ && y2_ == otherCubic.y2_;
}

std::shared_ptr<CubicBezierEasing> cubicBezier(
    const double x1,
    const double y1,
    const double x2,
    const double y2) {
  return std::make_shared<CubicBezierEasing>(x1, y1, x2, y2);
}

std::shared_ptr<CubicBezierEasing> cubicBezier(
    jsi::Runtime &rt,
    const jsi::Object &easingConfig) {
  return std::make_shared<CubicBezierEasing>(rt, easingConfig);
}

} // namespace reanimated::css
