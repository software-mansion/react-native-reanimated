#include <reanimated/NativeAnimations/NativeAnimationTiming.h>

#include <cmath>

namespace reanimated::native_animation {

namespace {

bool isUnitInterval(const double value) {
  return value >= 0 && value <= 1;
}

struct ValidVisitor {
  bool operator()(const LinearTiming &) const {
    return true;
  }
  bool operator()(const CubicBezierTiming &bezier) const {
    return isUnitInterval(bezier.x1) && isUnitInterval(bezier.x2) && std::isfinite(bezier.y1) &&
        std::isfinite(bezier.y2);
  }
};

} // namespace

bool isValid(const AnimationTiming &timing) {
  return std::visit(ValidVisitor{}, timing);
}

} // namespace reanimated::native_animation
