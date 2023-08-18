#include "RuntimeDecorator.h"
#include <jsi/instrumentation.h>
#include <chrono>
#include <memory>
#include <unordered_map>
#include <utility>
#include "JsiUtils.h"

namespace reanimated {

void RuntimeDecorator::decorateUIRuntime(
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
    const MaybeFlushUIUpdatesQueueFunction maybeFlushUIUpdatesQueueFunction) {
  rt.global().setProperty(rt, "_UI", jsi::Value(true));

#ifdef RCT_NEW_ARCH_ENABLED
  jsi_utils::installJsiFunction(rt, "_updatePropsFabric", updateProps);
  jsi_utils::installJsiFunction(
      rt, "_removeFromPropsRegistry", removeFromPropsRegistry);
  jsi_utils::installJsiFunction(rt, "_dispatchCommandFabric", dispatchCommand);
  jsi_utils::installJsiFunction(rt, "_measureFabric", measure);
#else
  jsi_utils::installJsiFunction(rt, "_updatePropsPaper", updateProps);
  jsi_utils::installJsiFunction(rt, "_dispatchCommandPaper", dispatchCommand);
  jsi_utils::installJsiFunction(rt, "_scrollToPaper", scrollTo);

  std::function<jsi::Value(jsi::Runtime &, int)> _measure =
      [measure](jsi::Runtime &rt, int viewTag) -> jsi::Value {
    auto result = measure(viewTag);
    jsi::Object resultObject(rt);
    for (auto &i : result) {
      resultObject.setProperty(rt, i.first.c_str(), i.second);
    }
    return resultObject;
  };

  jsi_utils::installJsiFunction(rt, "_measurePaper", _measure);
#endif // RCT_NEW_ARCH_ENABLED

  jsi_utils::installJsiFunction(rt, "requestAnimationFrame", requestFrame);
  jsi_utils::installJsiFunction(
      rt, "_updateDataSynchronously", updateDataSynchronously);

  auto performanceNow = [getCurrentTime](
                            jsi::Runtime &,
                            const jsi::Value &,
                            const jsi::Value *,
                            size_t) -> jsi::Value {
    return jsi::Value(getCurrentTime());
  };
  jsi::Object performance(rt);
  performance.setProperty(
      rt,
      "now",
      jsi::Function::createFromHostFunction(
          rt, jsi::PropNameID::forAscii(rt, "now"), 0, performanceNow));
  rt.global().setProperty(rt, "performance", performance);

  // layout animation
  jsi_utils::installJsiFunction(
      rt, "_notifyAboutProgress", progressLayoutAnimationFunction);
  jsi_utils::installJsiFunction(
      rt, "_notifyAboutEnd", endLayoutAnimationFunction);

  jsi_utils::installJsiFunction(rt, "_setGestureState", setGestureState);
  jsi_utils::installJsiFunction(
      rt, "_maybeFlushUIUpdatesQueue", maybeFlushUIUpdatesQueueFunction);
}

void RuntimeDecorator::decorateRNRuntime(
    jsi::Runtime &rnRuntime,
    jsi::Runtime &uiRuntime,
    bool isReducedMotion) {
  auto workletRuntimeValue =
      rnRuntime.global()
          .getPropertyAsObject(rnRuntime, "ArrayBuffer")
          .asFunction(rnRuntime)
          .callAsConstructor(rnRuntime, {static_cast<double>(sizeof(void *))});
  uintptr_t *workletRuntimeData = reinterpret_cast<uintptr_t *>(
      workletRuntimeValue.getObject(rnRuntime).getArrayBuffer(rnRuntime).data(
          rnRuntime));
  workletRuntimeData[0] = reinterpret_cast<uintptr_t>(&uiRuntime);

  rnRuntime.global().setProperty(
      rnRuntime, "_WORKLET_RUNTIME", workletRuntimeValue);

  rnRuntime.global().setProperty(rnRuntime, "_WORKLET", false);

#ifdef RCT_NEW_ARCH_ENABLED
  constexpr auto isFabric = true;
#else
  constexpr auto isFabric = false;
#endif // RCT_NEW_ARCH_ENABLED
  rnRuntime.global().setProperty(rnRuntime, "_IS_FABRIC", isFabric);

  auto version = getReanimatedVersionString(rnRuntime);
  rnRuntime.global().setProperty(rnRuntime, "_REANIMATED_VERSION_CPP", version);

  rnRuntime.global().setProperty(
      rnRuntime, "_REANIMATED_IS_REDUCED_MOTION", isReducedMotion);
}

} // namespace reanimated
