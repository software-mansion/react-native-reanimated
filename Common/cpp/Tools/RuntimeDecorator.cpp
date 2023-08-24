#include "RuntimeDecorator.h"
#include <jsi/instrumentation.h>
#include <chrono>
#include <memory>
#include <unordered_map>
#include <utility>
#include "JSISerializer.h"
#include "JsiUtils.h"
#include "ReanimatedHiddenHeaders.h"

namespace reanimated {

static jsi::String toStringValue(jsi::Runtime &rt, jsi::Value const &value) {
  return jsi::String::createFromUtf8(rt, stringifyJSIValue(rt, value));
}

static void logValue(jsi::Runtime &rt, jsi::Value const &value) {
  Logger::log(stringifyJSIValue(rt, value));
}

std::unordered_map<RuntimePointer, RuntimeType>
    &RuntimeDecorator::runtimeRegistry() {
  static std::unordered_map<RuntimePointer, RuntimeType> runtimeRegistry;
  return runtimeRegistry;
}

void RuntimeDecorator::registerRuntime(
    jsi::Runtime *runtime,
    RuntimeType runtimeType) {
  runtimeRegistry().insert({runtime, runtimeType});
}

void RuntimeDecorator::decorateRuntime(
    jsi::Runtime &rt,
    const std::string &label) {
  // This property will be used to find out if a runtime is a custom worklet
  // runtime (e.g. UI, VisionCamera frame processor, ...)
  rt.global().setProperty(rt, "_WORKLET", jsi::Value(true));
  // This property will be used for debugging
  rt.global().setProperty(
      rt, "_LABEL", jsi::String::createFromAscii(rt, label));

  rt.global().setProperty(rt, "global", rt.global());

#ifdef DEBUG
  auto evalWithSourceUrl = [](jsi::Runtime &rt,
                              const jsi::Value &thisValue,
                              const jsi::Value *args,
                              size_t count) -> jsi::Value {
    auto code = std::make_shared<const jsi::StringBuffer>(
        args[0].asString(rt).utf8(rt));
    std::string url;
    if (count > 1 && args[1].isString()) {
      url = args[1].asString(rt).utf8(rt);
    }

    return rt.evaluateJavaScript(code, url);
  };

  rt.global().setProperty(
      rt,
      "evalWithSourceUrl",
      jsi::Function::createFromHostFunction(
          rt,
          jsi::PropNameID::forAscii(rt, "evalWithSourceUrl"),
          1,
          evalWithSourceUrl));
#endif // DEBUG

  jsi_utils::installJsiFunction(rt, "_toString", toStringValue);
  jsi_utils::installJsiFunction(rt, "_log", logValue);
}

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
    const ScheduleOnJSFunction scheduleOnJS,
    const MakeShareableCloneFunction makeShareableClone,
    const UpdateDataSynchronouslyFunction updateDataSynchronously,
    const TimeProviderFunction getCurrentTime,
    const SetGestureStateFunction setGestureState,
    const ProgressLayoutAnimationFunction progressLayoutAnimationFunction,
    const EndLayoutAnimationFunction endLayoutAnimationFunction,
    const MaybeFlushUIUpdatesQueueFunction maybeFlushUIUpdatesQueueFunction) {
  RuntimeDecorator::decorateRuntime(rt, "UI");
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
  jsi_utils::installJsiFunction(rt, "_scheduleOnJS", scheduleOnJS);
  jsi_utils::installJsiFunction(rt, "_makeShareableClone", makeShareableClone);
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

#ifdef DEBUG
void checkJSVersion(jsi::Runtime &rnRuntime) {
  auto cppVersion = getReanimatedCppVersion();

  auto maybeJSVersion =
      rnRuntime.global().getProperty(rnRuntime, "_REANIMATED_VERSION_JS");
  if (maybeJSVersion.isUndefined()) {
    throw std::runtime_error(
        std::string(
            "[Reanimated] (C++) Native side failed to resolve JavaScript code version\n") +
        "See `http://localhost:3000/react-native-reanimated/docs/guides/troubleshooting#link` for more details.");
  }

  auto jsVersion = maybeJSVersion.asString(rnRuntime).utf8(rnRuntime);

  if (jsVersion != cppVersion) {
    throw std::runtime_error(
        std::string(
            "[Reanimated] (C++) Mismatch between C++ code version and JavaScript code version (") +
        cppVersion + " vs. " + jsVersion + " respectively)\n" +
        "See `http://localhost:3000/react-native-reanimated/docs/guides/troubleshooting#link` for more details.");
  }

  rnRuntime.global().setProperty(
      rnRuntime,
      "_REANIMATED_VERSION_CPP",
      jsi::String::createFromUtf8(rnRuntime, cppCodeVersion));
}
#endif // DEBUG

void RuntimeDecorator::decorateRNRuntime(
    jsi::Runtime &rnRuntime,
    const std::shared_ptr<jsi::Runtime> &uiRuntime,
    bool isReducedMotion) {
  auto workletRuntimeValue =
      rnRuntime.global()
          .getPropertyAsObject(rnRuntime, "ArrayBuffer")
          .asFunction(rnRuntime)
          .callAsConstructor(rnRuntime, {static_cast<double>(sizeof(void *))});
  uintptr_t *workletRuntimeData = reinterpret_cast<uintptr_t *>(
      workletRuntimeValue.getObject(rnRuntime).getArrayBuffer(rnRuntime).data(
          rnRuntime));
  workletRuntimeData[0] = reinterpret_cast<uintptr_t>(uiRuntime.get());

  rnRuntime.global().setProperty(
      rnRuntime, "_WORKLET_RUNTIME", workletRuntimeValue);

  rnRuntime.global().setProperty(rnRuntime, "_WORKLET", false);

#ifdef RCT_NEW_ARCH_ENABLED
  constexpr auto isFabric = true;
#else
  constexpr auto isFabric = false;
#endif // RCT_NEW_ARCH_ENABLED
  rnRuntime.global().setProperty(rnRuntime, "_IS_FABRIC", isFabric);

#ifdef DEBUG
  checkJSVersion(rnRuntime);
#endif // DEBUG

  rnRuntime.global().setProperty(
      rnRuntime, "_REANIMATED_IS_REDUCED_MOTION", isReducedMotion);
}

} // namespace reanimated
