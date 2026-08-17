#pragma once

#include <reanimated/NativeAnimations/NativeAnimationTypes.h>

#include <optional>

namespace reanimated::native_animation {

TrackBuildResult buildAnimationTrack(AnimationTrack track);
std::optional<AnimationResultReason> validateAnimationPlan(const AnimationPlan &plan);

} // namespace reanimated::native_animation
