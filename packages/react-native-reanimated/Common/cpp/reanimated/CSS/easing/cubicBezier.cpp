#include <reanimated/CSS/easing/cubicBezier.h>

#include <cmath>
#include <cstdint>

namespace reanimated::css {

namespace {

constexpr double kEpsilon = 1e-6;
constexpr std::uint8_t kMaxNewtonIterations = 8;
/// Enough halvings of [0, 1] to reach double precision.
constexpr std::uint8_t kMaxBisectionIterations = 60;

/// One axis of a unit cubic Bezier in Horner form, as in WebKit's UnitBezier.
/// The derivative shares these coefficients so the two cannot disagree.
/// https://www.w3.org/TR/css-easing-1/#cubic-bezier-easing-functions
/// https://github.com/WebKit/WebKit/blob/main/Source/WebCore/platform/graphics/UnitBezier.h
struct CurveCoefficients {
  // Declared in initialisation order: b needs c, a needs both.
  double c, b, a;

  constexpr CurveCoefficients(const double p1, const double p2) : c(3.0 * p1), b(3.0 * (p2 - p1) - c), a(1.0 - c - b) {}

  constexpr double sample(const double t) const {
    return ((a * t + b) * t + c) * t;
  }

  constexpr double sampleDerivative(const double t) const {
    return (3.0 * a * t + 2.0 * b) * t + c;
  }
};

/// Inverts x over [0, 1], where CSS control points keep the curve monotonic and
/// the root unique.
double solveCurve(const double x, const CurveCoefficients &curve) {
  double t = x;

  for (std::uint8_t iteration = 0; iteration < kMaxNewtonIterations; ++iteration) {
    const double distance = curve.sample(t) - x;
    if (distance == 0.0) {
      // A cubic also crosses x outside [0, 1]; that root is not a solution.
      if (t >= 0.0 && t <= 1.0) {
        return t;
      }
      break;
    }
    const double slope = curve.sampleDerivative(t);
    if (std::abs(slope) < kEpsilon) {
      break;
    }
    const double step = distance / slope;
    t -= step;
    if (std::abs(distance) < kEpsilon && std::abs(step) < kEpsilon) {
      if (t >= 0.0 && t <= 1.0) {
        return t;
      }
      break;
    }
  }

  // Bisection converges on the unique root, and on the nearest endpoint when x
  // falls outside [0, 1]. Running it to full precision rather than stopping at
  // the first sample within kEpsilon keeps the fallback accurate on curves with
  // a near-flat region, where a small error in x is a large one in t.
  // For x outside [0, 1], css-easing-1 prescribes extension along the endpoint
  // tangents instead of this nearest-endpoint clamp; callers clamp progress to
  // [0, 1] today, so the difference is unobservable. Implement the tangent
  // extension if that clamp ever goes away.
  double low = 0.0, high = 1.0;
  for (std::uint8_t iteration = 0; iteration < kMaxBisectionIterations; ++iteration) {
    const double middle = (low + high) / 2.0;
    if (curve.sample(middle) < x) {
      low = middle;
    } else {
      high = middle;
    }
  }

  return (low + high) / 2.0;
}

} // namespace

EasingFunction cubicBezier(const double x1, const double y1, const double x2, const double y2) {
  // Fixed for the lifetime of the easing, so not recomputed per sample.
  const CurveCoefficients xCurve(x1, x2);
  const CurveCoefficients yCurve(y1, y2);

  return [xCurve, yCurve](const double x) {
    return yCurve.sample(solveCurve(x, xCurve));
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
