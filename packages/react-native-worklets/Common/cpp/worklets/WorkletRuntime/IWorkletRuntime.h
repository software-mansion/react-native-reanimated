#pragma once

#include <cxxreact/MessageQueueThread.h>
#include <jsi/jsi.h>
#include <jsireact/JSIExecutor.h>
#include <react/debug/react_native_assert.h>

#include <worklets/RunLoop/AsyncQueue.h>
#include <worklets/RunLoop/AsyncQueueImpl.h>
#include <worklets/RunLoop/EventLoop.h>
#include <worklets/SharedItems/Serializable.h>
#include <worklets/SharedItems/SerializableDetail.h>
#include <worklets/Tools/JSScheduler.h>
#include <worklets/WorkletRuntime/RuntimeData.h>

#include <memory>
#include <string>
#include <type_traits>
#include <utility>

using namespace facebook;
using namespace react;

namespace worklets {

template <typename TCallable>
concept ImplicitlySerializableCallable = std::is_assignable_v<const jsi::Function &, TCallable> ||
    std::is_assignable_v<const std::shared_ptr<SerializableWorklet> &, TCallable>;

template <typename TCallable>
concept RuntimeCallable = requires(TCallable &&callable, jsi::Runtime &rt) {
  // NOLINTNEXTLINE(readability/braces) cpplint doesn't understand concepts
  { callable(rt) };
} || ImplicitlySerializableCallable<TCallable>;

class IWorkletRuntime {
 public:
  void virtual schedule(jsi::Function &&function) const = 0;
  void virtual schedule(std::shared_ptr<SerializableWorklet> worklet) const = 0;
  void virtual schedule(std::function<void()> job) const = 0;
  void virtual schedule(std::function<void(jsi::Runtime &)> job) const = 0;

  /* #region runSync */

  template <RuntimeCallable TCallable, typename... Args>
  std::invoke_result_t<TCallable, Args...> runSync(TCallable &&callable, Args &&...args) const;
  template <typename... Args>
  jsi::Value runSync(const jsi::Function &function, Args &&...args) const {
    auto &rt = *runtime_;
    // We only use callGuard in debug mode, otherwise we call the provided
    // function directly. CallGuard provides a way of capturing exceptions in
    // JavaScript and propagating them to the main React Native thread such that
    // they can be presented using RN's LogBox.
#ifndef NDEBUG
    return getCallGuard(rt).call(rt, function, args...);
#else
    return function.call(rt, args...);
#endif // NDEBUG
  }
  template <typename... Args>
  jsi::Value runSync(const std::shared_ptr<SerializableWorklet> &worklet, Args &&...args) const {
    jsi::Runtime &rt = *runtime_;
    return runSync(worklet->toJSValue(rt).asObject(rt).asFunction(rt), std::forward<Args>(args)...);
  }
  template <RuntimeCallable TCallable>
  std::invoke_result_t<TCallable, jsi::Runtime &> runSync(TCallable &&job) const {
    jsi::Runtime &rt = getJSIRuntime();
    auto lock = std::unique_lock<std::recursive_mutex>(*runtimeMutex_);
    return job(rt);
  }

  /* #endregion */

  /* #region runSyncSerialized */

  template <ImplicitlySerializableCallable TCallable, typename... Args>
  std::shared_ptr<Serializable> runSyncSerialized(TCallable &&callable, Args &&...args) const;
  template <typename... Args>
  std::shared_ptr<Serializable> runSyncSerialized(const jsi::Function &function, Args &&...args) const {
    jsi::Runtime &rt = getJSIRuntime();
    auto lock = std::unique_lock<std::recursive_mutex>(*runtimeMutex_);
    auto result = runSync(function, std::forward<Args>(args)...);
    auto serializableResult = extractSerializableOrThrow(
        rt,
        result,
        "[Worklets] Function passed to `runSyncSerialized`"
        "must return a value serialized with `createSerializable`.");
    return serializableResult;
  }
  template <typename... Args>
  std::shared_ptr<Serializable> runSyncSerialized(const std::shared_ptr<SerializableWorklet> &worklet, Args &&...args)
      const {
    jsi::Runtime &rt = getJSIRuntime();
    auto lock = std::unique_lock<std::recursive_mutex>(*runtimeMutex_);
    auto result = runSync(worklet, std::forward<Args>(args)...);
    auto serializableResult = extractSerializableOrThrow(
        rt,
        result,
        "[Worklets] Worklet passed to `runSyncSerialized`"
        "must return a value serialized with `createSerializable`.");
    return serializableResult;
  }

  /* #endregion */

  [[nodiscard]] jsi::Runtime virtual &getJSIRuntime() const noexcept = 0;

  [[nodiscard]] uint64_t virtual getRuntimeId() const noexcept = 0;

  [[nodiscard]] std::string virtual getRuntimeName() const noexcept = 0;

  static std::weak_ptr<IWorkletRuntime> getWeakRuntimeFromJSIRuntime(jsi::Runtime &rt);

  IWorkletRuntime(std::shared_ptr<std::recursive_mutex> runtimeMutex, std::shared_ptr<jsi::Runtime> runtime)
      : runtimeMutex_(std::move(runtimeMutex)), runtime_(std::move(runtime)) {}

  virtual ~IWorkletRuntime() = default;

#ifndef NDEBUG
  static jsi::Function getCallGuard(jsi::Runtime &rt);
#endif // NDEBUG
 protected:
  const std::shared_ptr<std::recursive_mutex> runtimeMutex_;
  const std::shared_ptr<jsi::Runtime> runtime_;
};

} // namespace worklets
