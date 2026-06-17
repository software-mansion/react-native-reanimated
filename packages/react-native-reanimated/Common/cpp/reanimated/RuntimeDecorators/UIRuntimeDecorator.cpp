#include <reanimated/RuntimeDecorators/UIRuntimeDecorator.h>
#include <reanimated/Tools/ReaJSIUtils.h>

namespace reanimated {

void UIRuntimeDecorator::decorate(
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
    const std::optional<worklets::RequestAnimationFrameHostFunction> &requestAnimationFrame) {

  jsi_utils::installJsiFunction(uiRuntime, "_updateProps", updateProps);
  jsi_utils::installJsiFunction(uiRuntime, "_dispatchCommand", dispatchCommand);
  jsi_utils::installJsiFunction(uiRuntime, "_measure", measure);
  jsi_utils::installJsiFunction(uiRuntime, "_getAnimationTimestamp", getAnimationTimestamp);
  jsi_utils::installJsiFunction(uiRuntime, "_notifyAboutProgress", progressLayoutAnimation);
  jsi_utils::installJsiFunction(uiRuntime, "_notifyAboutEnd", endLayoutAnimation);
  jsi_utils::installJsiFunction(uiRuntime, "_setGestureState", setGestureState);
  jsi_utils::installJsiFunction(uiRuntime, "_obtainProp", obtainPropFunction);
  jsi_utils::installJsiFunction(uiRuntime, "_maybeFlushUIUpdatesQueue", maybeFlushUIUpdatesQueue);
  if (requestAnimationFrame.has_value()) {
    worklets::installRequestAnimationFrame(uiRuntime, *requestAnimationFrame);
  }
}

} // namespace reanimated
