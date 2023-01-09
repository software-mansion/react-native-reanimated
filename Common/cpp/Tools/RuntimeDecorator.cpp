#include "RuntimeDecorator.h"
#include <jsi/instrumentation.h>
#include <chrono>
#include <memory>
#include <unordered_map>
#include <utility>
#include "ReanimatedHiddenHeaders.h"

namespace reanimated {

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

  auto callback = [](jsi::Runtime &rt,
                     const jsi::Value &thisValue,
                     const jsi::Value *args,
                     size_t count) -> jsi::Value {
    const jsi::Value *value = &args[0];
    if (value->isString()) {
      Logger::log(value->getString(rt).utf8(rt).c_str());
    } else if (value->isNumber()) {
      Logger::log(value->getNumber());
    } else if (value->isUndefined()) {
      Logger::log("undefined");
    } else {
      Logger::log("unsupported value type");
    }
    return jsi::Value::undefined();
  };
  jsi::Value log = jsi::Function::createFromHostFunction(
      rt, jsi::PropNameID::forAscii(rt, "_log"), 1, callback);
  rt.global().setProperty(rt, "_log", log);

  auto chronoNow = [](jsi::Runtime &rt,
                      const jsi::Value &thisValue,
                      const jsi::Value *args,
                      size_t count) -> jsi::Value {
    double now = std::chrono::system_clock::now().time_since_epoch() /
        std::chrono::milliseconds(1);
    return jsi::Value(now);
  };

  rt.global().setProperty(
      rt,
      "_chronoNow",
      jsi::Function::createFromHostFunction(
          rt, jsi::PropNameID::forAscii(rt, "_chronoNow"), 0, chronoNow));
  jsi::Object performance(rt);
  performance.setProperty(
      rt,
      "now",
      jsi::Function::createFromHostFunction(
          rt, jsi::PropNameID::forAscii(rt, "now"), 0, chronoNow));
  rt.global().setProperty(rt, "performance", performance);
}

void RuntimeDecorator::decorateUIRuntime(
    jsi::Runtime &rt,
    const UpdatePropsFunction updateProps,
    const MeasureFunction measure,
#ifdef RCT_NEW_ARCH_ENABLED
    const RemoveShadowNodeFromRegistryFunction removeShadowNodeFromRegistry,
    const DispatchCommandFunction dispatchCommand,
#else
    const ScrollToFunction scrollTo,
#endif
    const RequestFrameFunction requestFrame,
    const ScheduleOnJSFunction scheduleOnJS,
    const MakeShareableCloneFunction makeShareableClone,
    const UpdateDataSynchronouslyFunction updateDataSynchronously,
    const TimeProviderFunction getCurrentTime,
    const RegisterSensorFunction registerSensor,
    const UnregisterSensorFunction unregisterSensor,
    const SetGestureStateFunction setGestureState,
    const ProgressLayoutAnimationFunction progressLayoutAnimationFunction,
    const EndLayoutAnimationFunction endLayoutAnimationFunction) {
  RuntimeDecorator::decorateRuntime(rt, "UI");
  rt.global().setProperty(rt, "_UI", jsi::Value(true));

#ifdef RCT_NEW_ARCH_ENABLED
  auto clb = [updateProps](
                 jsi::Runtime &rt,
                 const jsi::Value &thisValue,
                 const jsi::Value *args,
                 const size_t count) -> jsi::Value {
    updateProps(rt, args[0], args[1]);
    return jsi::Value::undefined();
  };
  jsi::Value updatePropsHostFunction = jsi::Function::createFromHostFunction(
      rt, jsi::PropNameID::forAscii(rt, "_updatePropsFabric"), 2, clb);
  rt.global().setProperty(rt, "_updatePropsFabric", updatePropsHostFunction);

  auto _removeShadowNodeFromRegistry = [removeShadowNodeFromRegistry](
                                           jsi::Runtime &rt,
                                           const jsi::Value &thisValue,
                                           const jsi::Value *args,
                                           const size_t count) -> jsi::Value {
    removeShadowNodeFromRegistry(rt, args[0]);
    return jsi::Value::undefined();
  };
  jsi::Value removeShadowNodeFromRegistryHostFunction =
      jsi::Function::createFromHostFunction(
          rt,
          jsi::PropNameID::forAscii(rt, "_removeShadowNodeFromRegistry"),
          2,
          _removeShadowNodeFromRegistry);
  rt.global().setProperty(
      rt,
      "_removeShadowNodeFromRegistry",
      removeShadowNodeFromRegistryHostFunction);

  auto clb3 = [dispatchCommand](
                  jsi::Runtime &rt,
                  const jsi::Value &thisValue,
                  const jsi::Value *args,
                  const size_t count) -> jsi::Value {
    dispatchCommand(rt, args[0], args[1], args[2]);
    return jsi::Value::undefined();
  };
  jsi::Value dispatchCommandHostFunction =
      jsi::Function::createFromHostFunction(
          rt, jsi::PropNameID::forAscii(rt, "_dispatchCommand"), 3, clb3);
  rt.global().setProperty(rt, "_dispatchCommand", dispatchCommandHostFunction);

  auto _measure = [measure](
                      jsi::Runtime &rt,
                      const jsi::Value &thisValue,
                      const jsi::Value *args,
                      const size_t count) -> jsi::Value {
    return measure(rt, args[0]);
  };
#else
  auto clb = [updateProps](
                 jsi::Runtime &rt,
                 const jsi::Value &thisValue,
                 const jsi::Value *args,
                 const size_t count) -> jsi::Value {
    const auto viewTag = args[0].asNumber();
    const jsi::Value *viewName = &args[1];
    const auto params = args[2].asObject(rt);
    updateProps(rt, viewTag, *viewName, params);
    return jsi::Value::undefined();
  };
  jsi::Value updatePropsHostFunction = jsi::Function::createFromHostFunction(
      rt, jsi::PropNameID::forAscii(rt, "_updatePropsPaper"), 3, clb);
  rt.global().setProperty(rt, "_updatePropsPaper", updatePropsHostFunction);

  auto _scrollTo = [scrollTo](
                       jsi::Runtime &rt,
                       const jsi::Value &thisValue,
                       const jsi::Value *args,
                       const size_t count) -> jsi::Value {
    int viewTag = static_cast<int>(args[0].asNumber());
    double x = args[1].asNumber();
    double y = args[2].asNumber();
    bool animated = args[3].getBool();
    scrollTo(viewTag, x, y, animated);
    return jsi::Value::undefined();
  };
  jsi::Value scrollToFunction = jsi::Function::createFromHostFunction(
      rt, jsi::PropNameID::forAscii(rt, "_scrollTo"), 4, _scrollTo);
  rt.global().setProperty(rt, "_scrollTo", scrollToFunction);

  auto _measure = [measure](
                      jsi::Runtime &rt,
                      const jsi::Value &thisValue,
                      const jsi::Value *args,
                      const size_t count) -> jsi::Value {
    int viewTag = static_cast<int>(args[0].asNumber());
    auto result = measure(viewTag);
    jsi::Object resultObject(rt);
    for (auto &i : result) {
      resultObject.setProperty(rt, i.first.c_str(), i.second);
    }
    return resultObject;
  };
#endif // RCT_NEW_ARCH_ENABLED

  jsi::Value measureFunction = jsi::Function::createFromHostFunction(
      rt, jsi::PropNameID::forAscii(rt, "_measure"), 1, _measure);
  rt.global().setProperty(rt, "_measure", measureFunction);

  auto clb2 = [requestFrame](
                  jsi::Runtime &rt,
                  const jsi::Value &thisValue,
                  const jsi::Value *args,
                  const size_t count) -> jsi::Value {
    requestFrame(rt, std::move(args[0]));
    return jsi::Value::undefined();
  };
  jsi::Value requestAnimationFrame = jsi::Function::createFromHostFunction(
      rt, jsi::PropNameID::forAscii(rt, "requestAnimationFrame"), 1, clb2);
  rt.global().setProperty(rt, "requestAnimationFrame", requestAnimationFrame);

  auto clb4 = [scheduleOnJS](
                  jsi::Runtime &rt,
                  const jsi::Value &thisValue,
                  const jsi::Value *args,
                  const size_t count) -> jsi::Value {
    scheduleOnJS(rt, args[0], args[1]);
    return jsi::Value::undefined();
  };
  jsi::Value scheduleOnJSFun = jsi::Function::createFromHostFunction(
      rt, jsi::PropNameID::forAscii(rt, "_scheduleOnJS"), 2, clb4);
  rt.global().setProperty(rt, "_scheduleOnJS", scheduleOnJSFun);

  auto clb5 = [makeShareableClone](
                  jsi::Runtime &rt,
                  const jsi::Value &thisValue,
                  const jsi::Value *args,
                  const size_t count) -> jsi::Value {
    return makeShareableClone(rt, std::move(args[0]));
  };
  jsi::Value makeShareableCloneFun = jsi::Function::createFromHostFunction(
      rt, jsi::PropNameID::forAscii(rt, "_makeShareableClone"), 1, clb5);
  rt.global().setProperty(rt, "_makeShareableClone", makeShareableCloneFun);

  auto clb51 = [updateDataSynchronously](
                   jsi::Runtime &rt,
                   const jsi::Value &thisValue,
                   const jsi::Value *args,
                   const size_t count) -> jsi::Value {
    updateDataSynchronously(rt, std::move(args[0]), std::move(args[1]));
    return jsi::Value::undefined();
  };
  jsi::Value updateDataSynchronouslyFun = jsi::Function::createFromHostFunction(
      rt, jsi::PropNameID::forAscii(rt, "_updateDataSynchronously"), 1, clb51);
  rt.global().setProperty(
      rt, "_updateDataSynchronously", updateDataSynchronouslyFun);

  auto clb6 = [getCurrentTime](
                  jsi::Runtime &rt,
                  const jsi::Value &thisValue,
                  const jsi::Value *args,
                  const size_t count) -> jsi::Value {
    return getCurrentTime();
  };
  jsi::Value timeFun = jsi::Function::createFromHostFunction(
      rt, jsi::PropNameID::forAscii(rt, "_getCurrentTime"), 0, clb6);
  rt.global().setProperty(rt, "_getCurrentTime", timeFun);

  rt.global().setProperty(rt, "_frameTimestamp", jsi::Value::undefined());
  rt.global().setProperty(rt, "_eventTimestamp", jsi::Value::undefined());

  // layout animation
  auto clb7 = [progressLayoutAnimationFunction](
                  jsi::Runtime &rt,
                  const jsi::Value &thisValue,
                  const jsi::Value *args,
                  size_t count) -> jsi::Value {
    progressLayoutAnimationFunction(args[0].asNumber(), args[1].asObject(rt));
    return jsi::Value::undefined();
  };
  jsi::Value _notifyAboutProgress = jsi::Function::createFromHostFunction(
      rt, jsi::PropNameID::forAscii(rt, "_notifyAboutProgress"), 2, clb7);
  rt.global().setProperty(rt, "_notifyAboutProgress", _notifyAboutProgress);

  auto clb8 = [endLayoutAnimationFunction](
                  jsi::Runtime &rt,
                  const jsi::Value &thisValue,
                  const jsi::Value *args,
                  size_t count) -> jsi::Value {
    endLayoutAnimationFunction(
        args[0].asNumber(), args[1].getBool(), args[2].getBool());
    return jsi::Value::undefined();
  };
  jsi::Value _notifyAboutEnd = jsi::Function::createFromHostFunction(
      rt, jsi::PropNameID::forAscii(rt, "_notifyAboutEnd"), 2, clb8);
  rt.global().setProperty(rt, "_notifyAboutEnd", _notifyAboutEnd);

  auto clb9 = [setGestureState](
                  jsi::Runtime &rt,
                  const jsi::Value &thisValue,
                  const jsi::Value *args,
                  size_t count) -> jsi::Value {
    int handlerTag = static_cast<int>(args[0].asNumber());
    int newState = static_cast<int>(args[1].asNumber());
    setGestureState(handlerTag, newState);
    return jsi::Value::undefined();
  };
  jsi::Value setGestureStateFunction = jsi::Function::createFromHostFunction(
      rt, jsi::PropNameID::forAscii(rt, "_setGestureState"), 2, clb9);
  rt.global().setProperty(rt, "_setGestureState", setGestureStateFunction);
}

} // namespace reanimated
