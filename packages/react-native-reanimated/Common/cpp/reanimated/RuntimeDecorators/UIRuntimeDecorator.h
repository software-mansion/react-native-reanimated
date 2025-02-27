#pragma once

#include <jsi/jsi.h>

#include <reanimated/Tools/PlatformDepMethodsHolder.h>

using namespace facebook;

namespace reanimated {

class UIRuntimeDecorator {
 public:
  static void decorate(
      jsi::Runtime &uiRuntime,
      const ObtainPropFunction obtainPropFunction,
      const UpdatePropsFunction updateProps,
      const MeasureFunction measure,
      const DispatchCommandFunction dispatchCommand,
      const GetAnimationTimestampFunction getAnimationTimestamp,
      const SetGestureStateFunction setGestureState,
      const ProgressLayoutAnimationFunction progressLayoutAnimation,
      const EndLayoutAnimationFunction endLayoutAnimation,
      const MaybeFlushUIUpdatesQueueFunction maybeFlushUIUpdatesQueue);
};

} // namespace reanimated
