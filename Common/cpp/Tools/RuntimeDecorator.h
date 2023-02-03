#pragma once

#include <jsi/jsi.h>
#include <stdio.h>
#include <memory>
#include <string>
#include <tuple>
#include <unordered_map>
#include <utility>
#include "PlatformDepMethodsHolder.h"

using namespace facebook;

namespace reanimated {

template <typename... Targs>
std::enable_if_t<(sizeof...(Targs) == 0), std::tuple<>> pushArgTypes(
    jsi::Runtime &rt,
    const jsi::Value &thisValue,
    const jsi::Value *args,
    const size_t count) {
  assert(count == 0);
  return std::make_tuple();
}

template <typename T, typename... Rest>
inline typename std::
    enable_if<std::is_same<T, int>::value, std::tuple<T, Rest...>>::type
    pushArgTypes(
        jsi::Runtime &rt,
        const jsi::Value &thisValue,
        const jsi::Value *args,
        const size_t count);

template <typename T, typename... Rest>
inline typename std::
    enable_if<std::is_same<T, bool>::value, std::tuple<T, Rest...>>::type
    pushArgTypes(
        jsi::Runtime &rt,
        const jsi::Value &thisValue,
        const jsi::Value *args,
        const size_t count);

template <typename T, typename... Rest>
inline typename std::
    enable_if<std::is_same<T, jsi::Object>::value, std::tuple<T, Rest...>>::type
    pushArgTypes(
        jsi::Runtime &rt,
        const jsi::Value &thisValue,
        const jsi::Value *args,
        const size_t count);

template <typename T, typename... Rest>
inline typename std::enable_if<
    std::is_same<T, jsi::Value const &>::value,
    std::tuple<T, Rest...>>::type
pushArgTypes(
    jsi::Runtime &rt,
    const jsi::Value &thisValue,
    const jsi::Value *args,
    const size_t count);

template <typename T, typename... Rest>
inline typename std::enable_if<
    std::is_same<T, jsi::Runtime &>::value,
    std::tuple<T, Rest...>>::type
pushArgTypes(
    jsi::Runtime &rt,
    const jsi::Value &thisValue,
    const jsi::Value *args,
    const size_t count);

template <typename T, typename... Rest>
inline typename std::
    enable_if<std::is_same<T, int>::value, std::tuple<T, Rest...>>::type
    pushArgTypes(
        jsi::Runtime &rt,
        const jsi::Value &thisValue,
        const jsi::Value *args,
        const size_t count) {
  auto arg = std::tuple<int>(args->asNumber());
  auto rest = pushArgTypes<Rest...>(rt, thisValue, args + 1, count - 1);
  return std::tuple_cat(std::move(arg), std::move(rest));
}

template <typename T, typename... Rest>
inline typename std::
    enable_if<std::is_same<T, bool>::value, std::tuple<T, Rest...>>::type
    pushArgTypes(
        jsi::Runtime &rt,
        const jsi::Value &thisValue,
        const jsi::Value *args,
        const size_t count) {
  auto arg = std::tuple<bool>(args->asBool());
  auto rest = pushArgTypes<Rest...>(rt, thisValue, std::next(args), count - 1);
  return std::tuple_cat(std::move(arg), std::move(rest));
}

template <typename T, typename... Rest>
inline typename std::
    enable_if<std::is_same<T, jsi::Object>::value, std::tuple<T, Rest...>>::type
    pushArgTypes(
        jsi::Runtime &rt,
        const jsi::Value &thisValue,
        const jsi::Value *args,
        const size_t count) {
  auto arg = std::make_tuple(args->asObject(rt));
  auto rest = pushArgTypes<Rest...>(rt, thisValue, std::next(args), count - 1);
  return std::tuple_cat(std::move(arg), std::move(rest));
}

template <typename T, typename... Rest>
inline typename std::enable_if<
    std::is_same<T, jsi::Runtime &>::value,
    std::tuple<T, Rest...>>::type
pushArgTypes(
    jsi::Runtime &rt,
    const jsi::Value &thisValue,
    const jsi::Value *args,
    const size_t count) {
  auto arg = std::tie(rt);
  auto rest = pushArgTypes<Rest...>(rt, thisValue, std::next(args), count - 1);
  return std::tuple_cat(arg, std::move(rest));
}

template <typename T, typename... Rest>
inline typename std::enable_if<
    std::is_same<T, jsi::Value const &>::value,
    std::tuple<T, Rest...>>::type
pushArgTypes(
    jsi::Runtime &rt,
    const jsi::Value &thisValue,
    const jsi::Value *args,
    const size_t count) {
  auto arg = std::tie(std::as_const(*args));
  auto rest = pushArgTypes<Rest...>(rt, thisValue, std::next(args), count - 1);
  return std::tuple_cat(arg, std::move(rest));
}

template <typename Ret, typename... Args>
std::tuple<Args...> getArgsForFunction(
    std::function<Ret(Args...)> function,
    jsi::Runtime &rt,
    const jsi::Value &thisValue,
    const jsi::Value *args,
    const size_t count) {
  return pushArgTypes<Args...>(rt, thisValue, args, count);
}

template <typename Ret, typename... Args>
size_t getFunctionArgsCount(std::function<Ret(Args...)> function) {
  return sizeof...(Args);
}

template <typename Ret, typename... Args>
std::function<jsi::Value(
    jsi::Runtime &,
    const jsi::Value &,
    const jsi::Value *,
    const size_t)>
createJsiFunction(std::function<Ret(Args...)> function) {
  return [function](
             jsi::Runtime &rt,
             const jsi::Value &thisValue,
             const jsi::Value *args,
             const size_t count) {
    auto argz = getArgsForFunction(function, rt, thisValue, args, count);
    std::apply(function, std::move(argz));
    return jsi::Value::undefined();
  };
}

template <typename Ret, typename... Args>
void installJsiFunction(
    jsi::Runtime &rt,
    std::string_view name,
    std::function<Ret(Args...)> function) {
  auto clb = createJsiFunction(function);
  auto argsCount = getFunctionArgsCount(function);
  jsi::Value jsiFunction = jsi::Function::createFromHostFunction(
      rt, jsi::PropNameID::forAscii(rt, name.data()), argsCount, clb);
  rt.global().setProperty(rt, name.data(), jsiFunction);
}

using RequestFrameFunction =
    std::function<void(jsi::Runtime &, const jsi::Value &)>;
using ScheduleOnJSFunction =
    std::function<void(jsi::Runtime &, const jsi::Value &, const jsi::Value &)>;
using MakeShareableCloneFunction =
    std::function<jsi::Value(jsi::Runtime &, const jsi::Value &)>;
using UpdateDataSynchronouslyFunction =
    std::function<void(jsi::Runtime &, const jsi::Value &, const jsi::Value &)>;

enum RuntimeType {
  /**
   Represents any runtime that supports the concept of workletization
   */
  Worklet,
  /**
   Represents the Reanimated UI worklet runtime specifically
   */
  UI
};
typedef jsi::Runtime *RuntimePointer;

class RuntimeDecorator {
 public:
  static void decorateRuntime(jsi::Runtime &rt, const std::string &label);
  static void decorateUIRuntime(
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
      const EndLayoutAnimationFunction endLayoutAnimationFunction);

  /**
   Returns true if the given Runtime is the Reanimated UI-Thread Runtime.
   */
  inline static bool isUIRuntime(jsi::Runtime &rt);
  /**
   Returns true if the given Runtime is a Runtime that supports the concept of
   Workletization. (REA, Vision, ...)
   */
  inline static bool isWorkletRuntime(jsi::Runtime &rt);
  /**
   Returns true if the given Runtime is the default React-JS Runtime.
   */
  inline static bool isReactRuntime(jsi::Runtime &rt);
  /**
   Register the given Runtime. This function is required for every
   RuntimeManager, otherwise future runtime checks will fail.
   */
  static void registerRuntime(jsi::Runtime *runtime, RuntimeType runtimeType);

 private:
  static std::unordered_map<RuntimePointer, RuntimeType> &runtimeRegistry();
};

inline bool RuntimeDecorator::isUIRuntime(jsi::Runtime &rt) {
  auto iterator = runtimeRegistry().find(&rt);
  if (iterator == runtimeRegistry().end())
    return false;
  return iterator->second == RuntimeType::UI;
}

inline bool RuntimeDecorator::isWorkletRuntime(jsi::Runtime &rt) {
  auto iterator = runtimeRegistry().find(&rt);
  if (iterator == runtimeRegistry().end())
    return false;
  auto type = iterator->second;
  return type == RuntimeType::UI || type == RuntimeType::Worklet;
}

inline bool RuntimeDecorator::isReactRuntime(jsi::Runtime &rt) {
  auto iterator = runtimeRegistry().find(&rt);
  if (iterator == runtimeRegistry().end())
    return true;
  return false;
}

} // namespace reanimated
