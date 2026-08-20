#include <reanimated/CSS/easing/cubicBezier.h>

#include <algorithm>

namespace reanimated::css {

namespace {

/// Polynomial coefficients of a unit cubic Bezier with control points
/// (0,0), (p1, ...), (p2, ...), (1,1), as used by WebKit's UnitBezier.
/// Deriving the curve and its derivative from the same coefficients keeps them
/// consistent - an independently expanded derivative is easy to get wrong, and
/// a wrong one sends Newton's method outside [0, 1].
struct Coefficients {
  // Declared in initialisation order: b depends on c, a depends on both.
  double c, b, a;

  explicit Coefficients(const double p1, const double p2) : c(3.0 * p1), b(3.0 * (p2 - p1) - c), a(1.0 - c - b) {}

  double sample(const double t) const {
    return ((a * t + b) * t + c) * t;
  }

  double sampleDerivative(const double t) const {
    return (3.0 * a * t + 2.0 * b) * t + c;
  }
};

} // namespace

double sampleCurveX(const double t, const double x1, const double x2) {
  return Coefficients(x1, x2).sample(t);
}

double sampleCurveY(const double t, const double y1, const double y2) {
  return Coefficients(y1, y2).sample(t);
}

double sampleCurveDerivativeX(const double t, const double x1, const double x2) {
  return Coefficients(x1, x2).sampleDerivative(t);
}

double solveCurveX(const double x, const double x1, const double x2, const double epsilon) {
  const Coefficients coefficients(x1, x2);
  double t2 = x;

  for (int iterations = 0; iterations < 8; ++iterations) {
    const double xValue = coefficients.sample(t2) - x;
    if (std::abs(xValue) < epsilon) {
      // A cubic can also cross x outside [0, 1]; only a root within the curve's
      // own domain is a valid solution.
      if (t2 >= 0.0 && t2 <= 1.0) {
        return t2;
      }
      break;
    }
    const double dX = coefficients.sampleDerivative(t2);
    if (std::abs(dX) < epsilon) {
      break;
    }
    t2 = t2 - xValue / dX;
  }

  double t0 = 0.0, t1 = 1.0;
  t2 = std::clamp(x, t0, t1);

  while (t0 < t1) {
    const double xValue = coefficients.sample(t2);
    if (std::abs(xValue - x) < epsilon) {
      return t2;
    }
    if (x > xValue) {
      t0 = t2;
    } else {
      t1 = t2;
    }
    const double next = (t0 + t1) / 2.0;
    if (next == t2) {
      break;
    }
    t2 = next;
  }

  return t2;
}

EasingFunction cubicBezier(const double x1, const double y1, const double x2, const double y2) {
  return [=](double x) {
    const double t = solveCurveX(x, x1, x2);
    return sampleCurveY(t, y1, y2);
  };
}

EasingFunction cubicBezier(jsi::Runtime &rt, const jsi::Object &easingConfig) {
  const auto x1 = easingConfig.getProperty(rt, "x1").asNumber();
  const auto y1 = easingConfig.getProperty(rt, "y1").asNumber();
  const auto x2 = easingConfig.getProperty(rt, "x2").asNumber();
  const auto y2 = easingConfig.getProperty(rt, "y2").asNumber();
  return cubicBezier(x1, y1, x2, y2);
}

} // namespace reanimated::css
