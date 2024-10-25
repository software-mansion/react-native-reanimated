#pragma once

#include <jsi/jsi.h>

#include <reanimated/Tools/PlatformDepMethodsHolder.h>

namespace reanimated {

using RequestAnimationFrameFunction =
    std::function<void(facebook::jsi::Runtime &, const facebook::jsi::Value &)>;

class UIRuntimeDecorator {
 public:
  static void decorate(
      facebook::jsi::Runtime &uiRuntime,
#ifdef RCT_NEW_ARCH_ENABLED
      const RemoveFromPropsRegistryFunction removeFromPropsRegistry,
#else
      const ScrollToFunction scrollTo,
#endif
      const ObtainPropFunction obtainPropFunction,
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
