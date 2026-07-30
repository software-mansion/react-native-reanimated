#include <reanimated/NativeAnimations/NativeAnimationIR.h>

namespace reanimated {

const char *nativeAnimationRouteName(const NativeAnimationRoute route) {
  switch (route) {
    case NativeAnimationRoute::Simple:
      return "simple";
    case NativeAnimationRoute::Structured:
      return "structured";
    case NativeAnimationRoute::Sampled:
      return "sampled";
    case NativeAnimationRoute::Legacy:
      return "legacy";
  }
}

const char *nativeAnimationRouteReasonName(const NativeAnimationRouteReason reason) {
  switch (reason) {
    case NativeAnimationRouteReason::CanonicalSingleTiming:
      return "canonical-single-timing";
    case NativeAnimationRouteReason::ContainsHoldOrSequence:
      return "contains-hold-or-sequence";
    case NativeAnimationRouteReason::RequiresSampling:
      return "requires-sampling";
    case NativeAnimationRouteReason::UnsupportedProperty:
      return "unsupported-property";
    case NativeAnimationRouteReason::UnsupportedValueType:
      return "unsupported-value-type";
    case NativeAnimationRouteReason::TransformOrderingUnavailable:
      return "transform-ordering-unavailable";
    case NativeAnimationRouteReason::InfiniteRepeat:
      return "infinite-repeat";
    case NativeAnimationRouteReason::InvalidInput:
      return "invalid-input";
    case NativeAnimationRouteReason::ExecutorMissingPrimitive:
      return "executor-missing-primitive";
  }
}

} // namespace reanimated
