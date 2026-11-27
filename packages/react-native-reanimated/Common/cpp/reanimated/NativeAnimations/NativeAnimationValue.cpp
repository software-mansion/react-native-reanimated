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

} // namespace

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
