#pragma once

#include <reanimated/NativeAnimations/NativeAnimationIdentity.h>

#include <variant>

namespace reanimated::native_animation {

struct AnimationPoint {
  double x{0};
  double y{0};
};

struct AnimationSize {
  double width{0};
  double height{0};
};

/// Channels are in the range [0, 1].
struct AnimationColor {
  double red{0};
  double green{0};
  double blue{0};
  double alpha{0};
};

using AnimationValue = std::variant<double, AnimationPoint, AnimationSize, AnimationColor>;

/// The value that the view shows when the host admits the command.
struct CurrentVisualValue {};

/// The current visual value when the command replaces an active track on the target, else `otherwise`.
/// Only the host knows at admission if the earlier track still plays.
struct VisualValueIfInterrupting {
  AnimationValue otherwise;
};

using AnimationStart = std::variant<AnimationValue, CurrentVisualValue, VisualValueIfInterrupting>;

bool valueMatchesTarget(const AnimationValue &value, AnimationTarget target);
bool isFinite(const AnimationValue &value);

} // namespace reanimated::native_animation
