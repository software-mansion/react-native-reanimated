#include <reanimated/RuntimeDecorators/UIRuntimeDecorator.h>
#include <worklets/Tools/WorkletsJSIUtils.h>

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
  jsi_utils::installJsiFunction(uiRuntime, "_updateProps", updateProps);
  jsi_utils::installJsiFunction(uiRuntime, "_dispatchCommand", dispatchCommand);
  jsi_utils::installJsiFunction(uiRuntime, "_measure", measure);

  jsi_utils::installJsiFunction(
      uiRuntime, "_getAnimationTimestamp", getAnimationTimestamp);

  jsi_utils::installJsiFunction(
      uiRuntime, "_notifyAboutProgress", progressLayoutAnimation);
  jsi_utils::installJsiFunction(
      uiRuntime, "_notifyAboutEnd", endLayoutAnimation);

  jsi_utils::installJsiFunction(uiRuntime, "_setGestureState", setGestureState);

  const auto microtaskQueueFinalizers =
      uiRuntime.global()
          .getProperty(uiRuntime, "_microtaskQueueFinalizers")
          .asObject(uiRuntime)
          .asArray(uiRuntime);

  microtaskQueueFinalizers.getPropertyAsFunction(uiRuntime, "push")
      .callWithThis(
          uiRuntime,
          microtaskQueueFinalizers,
          jsi::Function::createFromHostFunction(
              uiRuntime,
              jsi::PropNameID::forAscii(uiRuntime, "_maybeFlushUIUpdatesQueue"),
              0,
              jsi_utils::createHostFunction(maybeFlushUIUpdatesQueue)));

  jsi_utils::installJsiFunction(uiRuntime, "_obtainProp", obtainPropFunction);
}

} // namespace reanimated
