#pragma once

#include <jsi/jsi.h>

#include "PlatformDepMethodsHolder.h"

using namespace facebook;

namespace reanimated {

using RequestFrameFunction =
    std::function<void(jsi::Runtime &, const jsi::Value &)>;
using UpdateDataSynchronouslyFunction =
    std::function<void(jsi::Runtime &, const jsi::Value &, const jsi::Value &)>;

class UIRuntimeDecorator {
 public:
  static void decorate(
      jsi::Runtime &rt,
      const UpdatePropsFunction updateProps,
#ifdef RCT_NEW_ARCH_ENABLED
      const RemoveFromPropsRegistryFunction removeFromPropsRegistry,
#endif
      const MeasureFunction measure,
#ifdef RCT_NEW_ARCH_ENABLED
  // nothing
#else
      const ScrollToFunction scrollTo,
#endif
      const DispatchCommandFunction dispatchCommand,
      const RequestFrameFunction requestFrame,
      const UpdateDataSynchronouslyFunction updateDataSynchronously,
      const TimeProviderFunction getCurrentTime,
      const SetGestureStateFunction setGestureState,
      const ProgressLayoutAnimationFunction progressLayoutAnimationFunction,
      const EndLayoutAnimationFunction endLayoutAnimationFunction,
      const MaybeFlushUIUpdatesQueueFunction maybeFlushUIUpdatesQueueFunction);
};

} // namespace reanimated
