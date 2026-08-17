#include <reanimated/NativeAnimations/NativeAnimationValue.h>

#include <algorithm>
#include <cmath>
#include <type_traits>

namespace reanimated::native_animation {

bool valueMatchesTarget(const AnimationValue &value, const AnimationTarget target) {
  switch (target.kind) {
    case AnimationTargetKind::Position:
      return std::holds_alternative<AnimationPoint>(value);
    case AnimationTargetKind::Size:
    case AnimationTargetKind::ShadowOffset:
      return std::holds_alternative<AnimationSize>(value);
    case AnimationTargetKind::BackgroundColor:
    case AnimationTargetKind::BorderColor:
    case AnimationTargetKind::ShadowColor:
      return std::holds_alternative<AnimationColor>(value);
    case AnimationTargetKind::Transform:
      return std::holds_alternative<AnimationMatrix4>(value);
    case AnimationTargetKind::Opacity:
    case AnimationTargetKind::PositionX:
    case AnimationTargetKind::PositionY:
    case AnimationTargetKind::Width:
    case AnimationTargetKind::Height:
    case AnimationTargetKind::BorderRadius:
    case AnimationTargetKind::BorderWidth:
    case AnimationTargetKind::ShadowOpacity:
    case AnimationTargetKind::ShadowRadius:
      return std::holds_alternative<double>(value);
  }
  return false;
}

bool isFinite(const AnimationValue &value) {
  return std::visit(
      [](const auto &typedValue) {
        using T = std::decay_t<decltype(typedValue)>;
        if constexpr (std::is_same_v<T, double>) {
          return std::isfinite(typedValue);
        } else if constexpr (std::is_same_v<T, AnimationPoint>) {
          return std::isfinite(typedValue.x) && std::isfinite(typedValue.y);
        } else if constexpr (std::is_same_v<T, AnimationSize>) {
          return std::isfinite(typedValue.width) && std::isfinite(typedValue.height);
        } else if constexpr (std::is_same_v<T, AnimationColor>) {
          return std::isfinite(typedValue.red) && std::isfinite(typedValue.green) && std::isfinite(typedValue.blue) &&
              std::isfinite(typedValue.alpha);
        } else {
          return std::ranges::all_of(
              typedValue.values, [](const double component) { return std::isfinite(component); });
        }
      },
      value);
}

} // namespace reanimated::native_animation
