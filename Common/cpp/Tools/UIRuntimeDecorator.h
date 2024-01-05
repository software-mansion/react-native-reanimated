#pragma once

#include <jsi/jsi.h>

#include "PlatformDepMethodsHolder.h"

using namespace facebook;

namespace reanimated {

using RequestAnimationFrameFunction =
    std::function<void(jsi::Runtime &, const jsi::Value &)>;

class UIRuntimeDecorator {
 public:
  static void decorate(
      jsi::Runtime &uiRuntime,
#ifdef RCT_NEW_ARCH_ENABLED
      const RemoveFromPropsRegistryFunction removeFromPropsRegistry,
      const ObtainPropFabricFunction obtainPropFabricFunction,
#else
      const ScrollToFunction scrollTo,
      const ObtainPropFunction obtainPropFunction,
#endif
      const UpdatePropsFunction updateProps,
      const MeasureFunction measure,
      const DispatchCommandFunction dispatchCommand,
      const RequestAnimationFrameFunction requestAnimationFrame,
      const GetAnimationTimestampFunction getAnimationTimestamp,
      const SetGestureStateFunction setGestureState,
      const ProgressLayoutAnimationFunction progressLayoutAnimation,
      const EndLayoutAnimationFunction endLayoutAnimation,
      const MaybeFlushUIUpdatesQueueFunction maybeFlushUIUpdatesQueue);
};

} // namespace reanimated
