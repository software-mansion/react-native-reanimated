#pragma once

#include <reanimated/NativeAnimations/NativeAnimationIR.h>
#include <reanimated/NativeAnimations/NativeAnimationTypes.h>

#include <optional>
#include <vector>

namespace reanimated {

struct NativeLayoutGeometry {
  double originX;
  double originY;
  double width;
  double height;
};

struct NativeAnimationPlan {
  double totalDurationMs;
  std::vector<NativeAnimationTrack> tracks;
  NativeAnimationRoute route;
  NativeAnimationRouteReason routeReason;
  NativeAnimationStartValueSource startValueSource;
  NativeAnimationMountingMode mountingMode;
  NativeAnimationLifecycle lifecycle;
  std::optional<NativeLayoutGeometry> finalGeometry;
};

} // namespace reanimated
