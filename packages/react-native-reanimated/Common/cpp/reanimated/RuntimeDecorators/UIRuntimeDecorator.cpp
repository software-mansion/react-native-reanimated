#include <reanimated/RuntimeDecorators/UIRuntimeDecorator.h>
#include <worklets/Tools/WorkletsJSIUtils.h>

#include <utility>

namespace reanimated {

using namespace worklets;

void UIRuntimeDecorator::decorate(
    jsi::Runtime &uiRuntime,
    ObtainPropFunction obtainPropFunction,
    UpdatePropsFunction updateProps,
    MeasureFunction measure,
    DispatchCommandFunction dispatchCommand,
    GetAnimationTimestampFunction getAnimationTimestamp,
    SetGestureStateFunction setGestureState,
    ProgressLayoutAnimationFunction progressLayoutAnimation,
    EndLayoutAnimationFunction endLayoutAnimation,
    MaybeFlushUIUpdatesQueueFunction maybeFlushUIUpdatesQueue) {

  jsi_utils::installJsiFunction(uiRuntime, "_updateProps", std::move(updateProps));
  jsi_utils::installJsiFunction(uiRuntime, "_dispatchCommand", std::move(dispatchCommand));
  jsi_utils::installJsiFunction(uiRuntime, "_measure", std::move(measure));
  jsi_utils::installJsiFunction(uiRuntime, "_getAnimationTimestamp", std::move(getAnimationTimestamp));
  jsi_utils::installJsiFunction(uiRuntime, "_notifyAboutProgress", std::move(progressLayoutAnimation));
  jsi_utils::installJsiFunction(uiRuntime, "_notifyAboutEnd", std::move(endLayoutAnimation));
  jsi_utils::installJsiFunction(uiRuntime, "_setGestureState", std::move(setGestureState));
  jsi_utils::installJsiFunction(uiRuntime, "_obtainProp", std::move(obtainPropFunction));

  subscribeForMicrotasksFinalization(uiRuntime, std::move(maybeFlushUIUpdatesQueue));
}

void UIRuntimeDecorator::subscribeForMicrotasksFinalization(
    jsi::Runtime &uiRuntime,
    MaybeFlushUIUpdatesQueueFunction maybeFlushUIUpdatesQueue) {
  auto maybeMicrotaskQueueFinalizers = uiRuntime.global().getProperty(uiRuntime, "_microtaskQueueFinalizers");

  if (maybeMicrotaskQueueFinalizers.isUndefined()) {
    throw std::runtime_error(
        "[Reanimated] Expected microtaskQueueFinalizers to be defined. "
        "Perhaps Worklets failed to initialize the UI Runtime?");
  }

  const auto microtaskQueueFinalizers = maybeMicrotaskQueueFinalizers.asObject(uiRuntime).asArray(uiRuntime);

  microtaskQueueFinalizers.getPropertyAsFunction(uiRuntime, "push")
      .callWithThis(
          uiRuntime,
          microtaskQueueFinalizers,
          jsi::Function::createFromHostFunction(
              uiRuntime,
              jsi::PropNameID::forAscii(uiRuntime, "_maybeFlushUIUpdatesQueue"),
              0,
              jsi_utils::createHostFunction(std::move(maybeFlushUIUpdatesQueue))));
}

} // namespace reanimated
