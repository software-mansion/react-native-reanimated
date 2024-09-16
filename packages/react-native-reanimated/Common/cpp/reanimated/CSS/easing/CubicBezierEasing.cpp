#include <reanimated/CSS/CubicBezierEasing.h>

namespace reanimated {

double sampleCurveX(double t, double x1, double x2) {
  return 3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t;
}

double sampleCurveY(double t, double y1, double y2) {
  return 3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t;
}

double sampleCurveDerivativeX(double t, double x1, double x2) {
  return -6 * (1 - t) * t * x1 + 3 * (1 - t) * (1 - t) * x1 +
      6 * (1 - t) * t * x2 - 6 * t * t * x2 + 3 * t * t;
}

double solveCurveX(double x, double x1, double x2, double epsilon) {
  double t0 = 0.0, t1 = 1.0, t2 = x, xValue, dX;
  int iterations = 0;
  while (iterations < 8) {
    xValue = sampleCurveX(t2, x1, x2) - x;
    if (std::abs(xValue) < epsilon) {
      return t2;
    }
    dX = sampleCurveDerivativeX(t2, x1, x2);
    if (std::abs(dX) < epsilon) {
      break;
    }
    t2 = t2 - xValue / dX;
    iterations++;
  }

  // Fallback: Use binary search
  while (t0 < t1) {
    t2 = (t0 + t1) / 2.0;
    xValue = sampleCurveX(t2, x1, x2);
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

EasingFunction
createBezierFunction(double x1, double y1, double x2, double y2) {
  return [=](double x) {
    double t = solveCurveX(x, x1, x2);
    return sampleCurveY(t, y1, y2);
  };
}

} // namespace reanimated
