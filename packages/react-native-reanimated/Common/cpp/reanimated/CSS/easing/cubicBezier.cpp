#include <reanimated/CSS/easing/cubicBezier.h>

#include <algorithm>
#include <cmath>
#include <cstdint>

namespace reanimated::css {

namespace {

/// Newton's method converges within a few steps for the curves CSS allows;
/// the bisection fallback covers the rest.
constexpr std::uint8_t kMaxNewtonIterations = 8;

/// Polynomial coefficients of one axis of a unit cubic Bezier with control
/// points (0, 0), (p1, ...), (p2, ...), (1, 1):
///
///   f(t) = ((a * t + b) * t + c) * t   with c = 3 * p1,
///                                          b = 3 * (p2 - p1) - c,
///                                          a = 1 - c - b
///
/// Expanding that gives the Bernstein polynomial the CSS easing spec defines,
/// and it is the form WebKit's UnitBezier uses:
/// https://www.w3.org/TR/css-easing-1/#cubic-bezier-easing-functions
/// https://github.com/WebKit/WebKit/blob/main/Source/WebCore/platform/graphics/UnitBezier.h
///
/// The derivative comes from the same coefficients so the two cannot disagree -
/// a separately expanded derivative is easy to get wrong, and a wrong one sends
/// Newton's method outside [0, 1].
struct Coefficients {
  // Declared in initialisation order: b depends on c, a depends on both.
  double c, b, a;

  constexpr Coefficients(const double p1, const double p2) : c(3.0 * p1), b(3.0 * (p2 - p1) - c), a(1.0 - c - b) {}

  constexpr double sample(const double t) const {
    return ((a * t + b) * t + c) * t;
  }

  constexpr double sampleDerivative(const double t) const {
    return (3.0 * a * t + 2.0 * b) * t + c;
  }
};

/// Inverts x over the curve's own domain. x is monotonic on [0, 1] for the
/// control points CSS permits, so the root there is unique.
double solveCurve(const double x, const Coefficients &curve, const double epsilon) {
  double t = x;

  for (std::uint8_t iteration = 0; iteration < kMaxNewtonIterations; ++iteration) {
    const double distance = curve.sample(t) - x;
    if (std::abs(distance) < epsilon) {
      // A cubic can also cross x outside [0, 1]; such a root is not a solution.
      if (t >= 0.0 && t <= 1.0) {
        return t;
      }
      break;
    }
    const double slope = curve.sampleDerivative(t);
    if (std::abs(slope) < epsilon) {
      break;
    }
    t = t - distance / slope;
  }

  double low = 0.0, high = 1.0;
  t = std::clamp(x, low, high);

  while (low < high) {
    const double sampled = curve.sample(t);
    if (std::abs(sampled - x) < epsilon) {
      return t;
    }
    if (x > sampled) {
      low = t;
    } else {
      high = t;
    }
    const double next = (low + high) / 2.0;
    if (next == t) {
      break;
    }
    t = next;
  }

  return t;
}

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
  return solveCurve(x, Coefficients(x1, x2), epsilon);
}

EasingFunction cubicBezier(const double x1, const double y1, const double x2, const double y2) {
  // Both axes are fixed for the lifetime of the easing, so their coefficients
  // are computed here rather than on every sample.
  const Coefficients xCurve(x1, x2);
  const Coefficients yCurve(y1, y2);

  return [xCurve, yCurve](const double x) {
    return yCurve.sample(solveCurve(x, xCurve, kCubicBezierEpsilon));
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
