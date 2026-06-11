#pragma once

#include <jsi/jsi.h>

#include <reanimated/Tools/PlatformDepMethodsHolder.h>
#include <worklets/Compat/StableApi.h>

#include <functional>
#include <optional>

using namespace facebook;

namespace reanimated {

// Testing-only (ReJest). Bundle of UI-runtime globals that expose the
// `NativeMutationsRegistry` to JS. Only installed when the `RUNTIME_TEST_FLAG`
// static feature flag is enabled.
struct NativeMutationsRecorderFunctions {
  std::function<void()> startRecording;
  std::function<void()> stopRecording;
  std::function<void()> clearRecording;
  std::function<jsi::Value(jsi::Runtime &)> getRecordedMutations;
  std::function<jsi::Value(jsi::Runtime &, const jsi::Value &, const jsi::Value &)> obtainLatestRecordedProp;
};

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
      const std::optional<worklets::RequestAnimationFrameHostFunction> &requestAnimationFrame,
      const NativeMutationsRecorderFunctions &nativeMutationsRecorderFunctions);
};

} // namespace reanimated
