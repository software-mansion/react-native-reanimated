#pragma once

#include <jsi/jsi.h>
#include <string>
#include <tuple>
#include <utility>

using namespace facebook;

namespace reanimated {
namespace jsi_utils {

// `pushArgTypes` functions take a variadic template parameter of target (C++)
// argument types `Targs` and a `jsi::Value` array `args`, and converts `args`
// to a tuple of typed C++ arguments to be passed to the native implementation.
// This is accomplished by dispatching (at compile time) to the correct
// implementation based on the first type of `Targs`, using SFINAE to select the
// correct specialization, and concatenating with the result of recursion on the
// rest of `Targs`

// BEGIN forward declarations for `pushArgTypes` specializations
template <typename T, typename... Rest>
inline typename std::
    enable_if<std::is_same<T, double>::value, std::tuple<T, Rest...>>::type
    pushArgTypes(jsi::Runtime &rt, const jsi::Value *args, const size_t count);

template <typename T, typename... Rest>
inline typename std::
    enable_if<std::is_same<T, int>::value, std::tuple<T, Rest...>>::type
    pushArgTypes(jsi::Runtime &rt, const jsi::Value *args, const size_t count);

template <typename T, typename... Rest>
inline typename std::
    enable_if<std::is_same<T, bool>::value, std::tuple<T, Rest...>>::type
    pushArgTypes(jsi::Runtime &rt, const jsi::Value *args, const size_t count);

template <typename T, typename... Rest>
inline typename std::
    enable_if<std::is_same<T, jsi::Object>::value, std::tuple<T, Rest...>>::type
    pushArgTypes(jsi::Runtime &rt, const jsi::Value *args, const size_t count);

template <typename T, typename... Rest>
inline typename std::enable_if<
    std::is_same<T, jsi::Value const &>::value,
    std::tuple<T, Rest...>>::type
pushArgTypes(jsi::Runtime &rt, const jsi::Value *args, const size_t count);

template <typename T, typename... Rest>
inline typename std::enable_if<
    std::is_same<T, jsi::Runtime &>::value,
    std::tuple<T, Rest...>>::type
pushArgTypes(jsi::Runtime &rt, const jsi::Value *args, const size_t count);
// END forward declarations for `pushArgTypes` specializations

// BEGIN implementations for `pushArgTypes` specializations.
// specialization for empty `Targs` - returns an empty tuple
template <typename... Targs>
std::enable_if_t<(sizeof...(Targs) == 0), std::tuple<>>
pushArgTypes(jsi::Runtime &rt, const jsi::Value *args, const size_t count) {
  assert(count == 0);
  return std::make_tuple();
}

// specialization for `First = double` - casts first of `args` to double and
// calls recursively on the rest of `args`
template <typename T, typename... Rest>
inline typename std::
    enable_if<std::is_same<T, double>::value, std::tuple<T, Rest...>>::type
    pushArgTypes(jsi::Runtime &rt, const jsi::Value *args, const size_t count) {
  assert(count > 0);
  auto arg = std::make_tuple<double>(args->asNumber());
  auto rest = pushArgTypes<Rest...>(rt, std::next(args), count - 1);
  return std::tuple_cat(std::move(arg), std::move(rest));
}

// specialization for `First = int` - casts first of `args` to int and calls
// recursively on the rest of `args`
template <typename T, typename... Rest>
inline typename std::
    enable_if<std::is_same<T, int>::value, std::tuple<T, Rest...>>::type
    pushArgTypes(jsi::Runtime &rt, const jsi::Value *args, const size_t count) {
  assert(count > 0);
  auto arg = std::make_tuple<int>(args->asNumber());
  auto rest = pushArgTypes<Rest...>(rt, std::next(args), count - 1);
  return std::tuple_cat(std::move(arg), std::move(rest));
}

// specialization for `First = bool` - casts first of `args` to bool and calls
// recursively on the rest of `args`
template <typename T, typename... Rest>
inline typename std::
    enable_if<std::is_same<T, bool>::value, std::tuple<T, Rest...>>::type
    pushArgTypes(jsi::Runtime &rt, const jsi::Value *args, const size_t count) {
  assert(count > 0);
  auto arg = std::make_tuple(args->asBool());
  auto rest = pushArgTypes<Rest...>(rt, std::next(args), count - 1);
  return std::tuple_cat(std::move(arg), std::move(rest));
}

// specialization for `First = jsi::Object` - casts first of `args` to a JSI
// object and calls recursively on the rest of `args`
template <typename T, typename... Rest>
inline typename std::
    enable_if<std::is_same<T, jsi::Object>::value, std::tuple<T, Rest...>>::type
    pushArgTypes(jsi::Runtime &rt, const jsi::Value *args, const size_t count) {
  assert(count > 0);
  auto arg = std::make_tuple(args->asObject(rt));
  auto rest = pushArgTypes<Rest...>(rt, std::next(args), count - 1);
  return std::tuple_cat(std::move(arg), std::move(rest));
}

// specialization for `First = jsi::Runtime&`. Passes the runtime this function
// was called inside and calls recursively with `args`. This is because the
// `jsi::Runtime&` parameters aren't passed from JS when the function is called
// and are instead supplied by the JSI API in a separate argument to the native
// function.
template <typename T, typename... Rest>
inline typename std::enable_if<
    std::is_same<T, jsi::Runtime &>::value,
    std::tuple<T, Rest...>>::type
pushArgTypes(jsi::Runtime &rt, const jsi::Value *args, const size_t count) {
  auto arg = std::tie(rt);
  auto rest = pushArgTypes<Rest...>(rt, args, count);
  return std::tuple_cat(arg, std::move(rest));
}

// specialization for `First = jsi::Value const &` - passes the first of `args`
// and calls recursively on the rest of `args`
template <typename T, typename... Rest>
inline typename std::enable_if<
    std::is_same<T, jsi::Value const &>::value,
    std::tuple<T, Rest...>>::type
pushArgTypes(jsi::Runtime &rt, const jsi::Value *args, const size_t count) {
  auto arg = std::tie(std::as_const(*args));
  auto rest = pushArgTypes<Rest...>(rt, std::next(args), count - 1);
  return std::tuple_cat(arg, std::move(rest));
}
// END implementations for `pushArgTypes` specializations.

// returns a tuple with the result of casting `args` to appropriate
// native C++ types needed to call `function`
template <typename Ret, typename... Args>
std::tuple<Args...> getArgsForFunction(
    std::function<Ret(Args...)> function,
    jsi::Runtime &rt,
    const jsi::Value *args,
    const size_t count) {
  return pushArgTypes<Args...>(rt, args, count);
}

// counts the (non-`jsi::Runtime &`) arguments the on the `...Args`
// list of types
template <typename... Args>
inline std::enable_if_t<sizeof...(Args) == 0, size_t> countArgs() {
  return 0;
}

template <typename First, typename... Rest>
inline size_t countArgs() {
  size_t countFirst = (typeid(First) != typeid(jsi::Runtime &) ? 1 : 0);
  size_t countRest = countArgs<Rest...>();
  return countFirst + countRest;
}

// returns the number of (non-`jsi::Runtime &`) arguments
// of `function`
template <typename Ret, typename... Args>
size_t getFunctionArgsCount(std::function<Ret(Args...)> function) {
  return countArgs<Args...>();
}

// returns a function with JSI calling convention
// from a native function `function` which takes
// `...Args` arguments and returns `Ret`
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
    auto argz = getArgsForFunction(function, rt, args, count);
    return std::apply(function, std::move(argz));
  };
}

// returns a function with JSI calling convention
// from a native function `function` which takes
// `...Args` arguments and returns `void`
template <typename... Args>
std::function<jsi::Value(
    jsi::Runtime &,
    const jsi::Value &,
    const jsi::Value *,
    const size_t)>
createJsiFunction(std::function<void(Args...)> function) {
  return [function](
             jsi::Runtime &rt,
             const jsi::Value &thisValue,
             const jsi::Value *args,
             const size_t count) {
    auto argz = getArgsForFunction(function, rt, args, count);
    std::apply(function, std::move(argz));
    return jsi::Value::undefined();
  };
}

// creates a JSI compatible function from `function`
// and installs it as a global function named `name`
// in the `rt` JS runtime
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

} // namespace jsi_utils
} // namespace reanimated
