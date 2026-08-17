#pragma once

#include <reanimated/NativeAnimations/NativeAnimationIdentity.h>

#include <array>
#include <variant>

namespace reanimated::native_animation {

struct AnimationPoint {
  double x{0};
  double y{0};

  bool operator==(const AnimationPoint &) const = default;
};

struct AnimationSize {
  double width{0};
  double height{0};

  bool operator==(const AnimationSize &) const = default;
};

struct AnimationColor {
  double red{0};
  double green{0};
  double blue{0};
  double alpha{0};

  bool operator==(const AnimationColor &) const = default;
};

struct AnimationMatrix4 {
  std::array<double, 16> values{};

  bool operator==(const AnimationMatrix4 &) const = default;
};

using AnimationValue = std::variant<double, AnimationPoint, AnimationSize, AnimationColor, AnimationMatrix4>;

struct CurrentVisualValue {
  bool operator==(const CurrentVisualValue &) const = default;
};

using AnimationStart = std::variant<AnimationValue, CurrentVisualValue>;

bool valueMatchesTarget(const AnimationValue &value, AnimationTarget target);
bool isFinite(const AnimationValue &value);

} // namespace reanimated::native_animation
