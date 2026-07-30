#pragma once

#include <reanimated/NativeAnimations/NativeAnimationIR.h>
#include <reanimated/NativeAnimations/NativeAnimationTypes.h>

#include <vector>

namespace reanimated {

struct NativeAnimationPlan {
  double totalDurationMs;
  std::vector<NativeAnimationTrack> tracks;
  NativeAnimationRoute route;
  NativeAnimationRouteReason routeReason;
  NativeAnimationStartValueSource startValueSource;
  NativeAnimationMountingMode mountingMode;
  NativeAnimationLifecycle lifecycle;
};

} // namespace reanimated
