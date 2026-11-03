#include <reanimated/NativeAnimations/NativeAnimationValue.h>

#include <cmath>

namespace reanimated::native_animation {

namespace {

struct FiniteVisitor {
  bool operator()(const double value) const {
    return std::isfinite(value);
  }
  bool operator()(const AnimationPoint &point) const {
    return std::isfinite(point.x) && std::isfinite(point.y);
  }
  bool operator()(const AnimationSize &size) const {
    return std::isfinite(size.width) && std::isfinite(size.height);
  }
  bool operator()(const AnimationColor &color) const {
    return std::isfinite(color.red) && std::isfinite(color.green) && std::isfinite(color.blue) &&
        std::isfinite(color.alpha);
  }
};

bool isClose(const double lhs, const double rhs) {
  return std::abs(lhs - rhs) <= ENDPOINT_TOLERANCE;
}

struct SameValueVisitor {
  bool operator()(const double lhs, const double rhs) const {
    return isClose(lhs, rhs);
  }
  bool operator()(const AnimationPoint &lhs, const AnimationPoint &rhs) const {
    return isClose(lhs.x, rhs.x) && isClose(lhs.y, rhs.y);
  }
  bool operator()(const AnimationSize &lhs, const AnimationSize &rhs) const {
    return isClose(lhs.width, rhs.width) && isClose(lhs.height, rhs.height);
  }
  bool operator()(const AnimationColor &lhs, const AnimationColor &rhs) const {
    return isClose(lhs.red, rhs.red) && isClose(lhs.green, rhs.green) && isClose(lhs.blue, rhs.blue) &&
        isClose(lhs.alpha, rhs.alpha);
  }
  template <typename Lhs, typename Rhs>
  bool operator()(const Lhs &, const Rhs &) const {
    return false;
  }
};

} // namespace

bool isSameValue(const AnimationValue &lhs, const AnimationValue &rhs) {
  return std::visit(SameValueVisitor{}, lhs, rhs);
}

bool valueMatchesTarget(const AnimationValue &value, const AnimationTarget target) {
  switch (target) {
    case AnimationTarget::Position:
      return std::holds_alternative<AnimationPoint>(value);
    case AnimationTarget::Size:
    case AnimationTarget::ShadowOffset:
      return std::holds_alternative<AnimationSize>(value);
    case AnimationTarget::BackgroundColor:
    case AnimationTarget::BorderColor:
    case AnimationTarget::ShadowColor:
      return std::holds_alternative<AnimationColor>(value);
    case AnimationTarget::Opacity:
    case AnimationTarget::PositionX:
    case AnimationTarget::PositionY:
    case AnimationTarget::Width:
    case AnimationTarget::Height:
    case AnimationTarget::BorderRadius:
    case AnimationTarget::ShadowOpacity:
    case AnimationTarget::ShadowRadius:
      return std::holds_alternative<double>(value);
  }
  return false;
}

bool isFinite(const AnimationValue &value) {
  return std::visit(FiniteVisitor{}, value);
}

} // namespace reanimated::native_animation
