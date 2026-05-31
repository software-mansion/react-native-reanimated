#pragma once

#include <jsi/jsi.h>

#include <reanimated/Tools/PlatformDepMethodsHolder.h>
#include <worklets/Compat/StableApi.h>

#include <optional>

using namespace facebook;

namespace reanimated {

class UIRuntimeDecorator {
 public:
  static void decorate(
      jsi::Runtime &uiRuntime,
      const ObtainPropFunction &obtainPropFunction,
      const UpdatePropsFunction &updateProps,
      const MeasureFunction &measure,
      const DispatchCommandFunction &dispatchCommand,
      const GetAnimationTimestampFunction &getAnimationTimestamp,
      const SetGestureStateFunction &setGestureState,
      const ProgressLayoutAnimationFunction &progressLayoutAnimation,
      const EndLayoutAnimationFunction &endLayoutAnimation,
      const MaybeFlushUIUpdatesQueueFunction &maybeFlushUIUpdatesQueue,
      const std::optional<worklets::RequestAnimationFrameHostFunction> &requestAnimationFrame);
};

} // namespace reanimated
