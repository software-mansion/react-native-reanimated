#include <reanimated/RuntimeDecorators/UIRuntimeDecorator.h>
#include <worklets/Tools/ReanimatedJSIUtils.h>

namespace reanimated {

void UIRuntimeDecorator::decorate(
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
    const MaybeFlushUIUpdatesQueueFunction maybeFlushUIUpdatesQueue) {
  uiRuntime.global().setProperty(uiRuntime, "_UI", true);

#ifdef RCT_NEW_ARCH_ENABLED
  worklets::jsi_utils::installJsiFunction(
      uiRuntime, "_updatePropsFabric", updateProps);
  worklets::jsi_utils::installJsiFunction(
      uiRuntime, "_removeFromPropsRegistry", removeFromPropsRegistry);
  worklets::jsi_utils::installJsiFunction(
      uiRuntime, "_dispatchCommandFabric", dispatchCommand);
  worklets::jsi_utils::installJsiFunction(uiRuntime, "_measureFabric", measure);
#else
  worklets::jsi_utils::installJsiFunction(
      uiRuntime, "_updatePropsPaper", updateProps);
  worklets::jsi_utils::installJsiFunction(
      uiRuntime, "_dispatchCommandPaper", dispatchCommand);
  worklets::jsi_utils::installJsiFunction(
      uiRuntime, "_scrollToPaper", scrollTo);
  worklets::jsi_utils::installJsiFunction(
      uiRuntime,
      "_measurePaper",
      [measure](
          facebook::jsi::Runtime &rt, int viewTag) -> facebook::jsi::Value {
        auto result = measure(viewTag);
        facebook::jsi::Object resultObject(rt);
        for (const auto &item : result) {
          resultObject.setProperty(rt, item.first.c_str(), item.second);
        }
        return resultObject;
      });
  worklets::jsi_utils::installJsiFunction(
      uiRuntime, "_obtainPropPaper", obtainPropFunction);
#endif // RCT_NEW_ARCH_ENABLED

  worklets::jsi_utils::installJsiFunction(
      uiRuntime, "requestAnimationFrame", requestAnimationFrame);
  worklets::jsi_utils::installJsiFunction(
      uiRuntime, "_getAnimationTimestamp", getAnimationTimestamp);

  worklets::jsi_utils::installJsiFunction(
      uiRuntime, "_notifyAboutProgress", progressLayoutAnimation);
  worklets::jsi_utils::installJsiFunction(
      uiRuntime, "_notifyAboutEnd", endLayoutAnimation);

  worklets::jsi_utils::installJsiFunction(
      uiRuntime, "_setGestureState", setGestureState);
  worklets::jsi_utils::installJsiFunction(
      uiRuntime, "_maybeFlushUIUpdatesQueue", maybeFlushUIUpdatesQueue);

  worklets::jsi_utils::installJsiFunction(
      uiRuntime, "_obtainPropFabric", obtainPropFunction);
}

} // namespace reanimated
