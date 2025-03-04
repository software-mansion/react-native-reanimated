#include <reanimated/RuntimeDecorators/UIRuntimeDecorator.h>
#include <worklets/Tools/ReanimatedJSIUtils.h>

namespace reanimated {

using namespace worklets;

void UIRuntimeDecorator::decorate(
    jsi::Runtime &uiRuntime,
    const ObtainPropFunction obtainPropFunction,
    const UpdatePropsFunction updateProps,
    const MeasureFunction measure,
    const DispatchCommandFunction dispatchCommand,
    const GetAnimationTimestampFunction getAnimationTimestamp,
    const SetGestureStateFunction setGestureState,
    const ProgressLayoutAnimationFunction progressLayoutAnimation,
    const EndLayoutAnimationFunction endLayoutAnimation,
    const MaybeFlushUIUpdatesQueueFunction maybeFlushUIUpdatesQueue) {
  jsi_utils::installJsiFunction(uiRuntime, "_updatePropsFabric", updateProps);
  jsi_utils::installJsiFunction(
      uiRuntime, "_dispatchCommandFabric", dispatchCommand);
  jsi_utils::installJsiFunction(uiRuntime, "_measureFabric", measure);

  jsi_utils::installJsiFunction(
      uiRuntime, "_getAnimationTimestamp", getAnimationTimestamp);

  jsi_utils::installJsiFunction(
      uiRuntime, "_notifyAboutProgress", progressLayoutAnimation);
  jsi_utils::installJsiFunction(
      uiRuntime, "_notifyAboutEnd", endLayoutAnimation);

  jsi_utils::installJsiFunction(uiRuntime, "_setGestureState", setGestureState);
  jsi_utils::installJsiFunction(
      uiRuntime, "_maybeFlushUIUpdatesQueue", maybeFlushUIUpdatesQueue);

  jsi_utils::installJsiFunction(
      uiRuntime, "_obtainPropFabric", obtainPropFunction);
}

} // namespace reanimated
