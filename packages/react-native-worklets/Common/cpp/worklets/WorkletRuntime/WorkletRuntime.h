#pragma once

#include <jsi/jsi.h>
#include <react/debug/react_native_assert.h>
#include <worklets/RunLoop/AsyncQueue.h>
#include <worklets/RunLoop/AsyncQueueImpl.h>
#include <worklets/RunLoop/EventLoop.h>
#include <worklets/SharedItems/Serializable.h>
#include <worklets/SharedItems/UnpackerLoader.h>
#include <worklets/Tools/JSLogger.h>
#include <worklets/Tools/JSScheduler.h>
#include <worklets/Tools/ScriptBuffer.h>
#include <worklets/WorkletRuntime/RuntimeBindings.h>
#include <worklets/WorkletRuntime/RuntimeData.h>

#include <memory>
#include <optional>
#include <string>
#include <type_traits>
#include <utility>
#include <vector>

namespace worklets {

using namespace facebook;
using namespace react;

template <typename TCallable>
concept ImplicitlySerializableCallable = std::is_assignable_v<const jsi::Function &, TCallable> ||
    std::is_assignable_v<const std::shared_ptr<SerializableWorklet> &, TCallable>;

template <typename TCallable>
concept RuntimeCallable = requires(TCallable &&callable, jsi::Runtime &rt) {
  { callable(rt) };
} || ImplicitlySerializableCallable<TCallable>;

/**
 * Forward declaration to avoid circular dependencies.
 */
class JSIWorkletsModuleProxy;

class WorkletRuntime : public jsi::HostObject, public std::enable_shared_from_this<WorkletRuntime> {
 public:
  void schedule(jsi::Function &&function) const;
  void schedule(std::shared_ptr<SerializableWorklet> worklet) const;
#ifndef NDEBUG
  void schedule(std::shared_ptr<SerializableWorklet> worklet, std::optional<std::string> scheduleStack) const;
#endif // NDEBUG
  void schedule(std::function<void()> job) const;
  void schedule(std::function<void(jsi::Runtime &)> job) const;

  /* #region runSync */

  template <RuntimeCallable TCallable, typename... Args>
  std::invoke_result_t<TCallable, Args...> runSync(TCallable &&callable, Args &&...args) const;
  template <typename... Args>
  jsi::Value runSync(const jsi::Function &function, Args &&...args) const {
#ifndef NDEBUG
    return callGuarded(function, std::nullopt, std::forward<Args>(args)...);
#else
    return function.call(*runtime_, args...);
#endif // NDEBUG
  }
  template <typename... Args>
  jsi::Value runSync(const std::shared_ptr<SerializableWorklet> &worklet, Args &&...args) const {
#ifndef NDEBUG
    return runSyncWithStack(worklet, std::nullopt, std::forward<Args>(args)...);
#else
    jsi::Runtime &rt = *runtime_;
    auto function = worklet->toJSValue(rt).asObject(rt).asFunction(rt);
    return function.call(rt, args...);
#endif // NDEBUG
  }
#ifndef NDEBUG
  template <typename... Args>
  jsi::Value runSyncWithStack(
      const std::shared_ptr<SerializableWorklet> &worklet,
      const std::optional<std::string> &scheduleStack,
      Args &&...args) const {
    jsi::Runtime &rt = *runtime_;
    auto function = worklet->toJSValue(rt).asObject(rt).asFunction(rt);
    return callGuarded(function, scheduleStack, std::forward<Args>(args)...);
  }
#endif // NDEBUG
  template <RuntimeCallable TCallable>
  std::invoke_result_t<TCallable, jsi::Runtime &> runSync(TCallable &&job) const {
    jsi::Runtime &rt = getJSIRuntime();
    auto lock = std::unique_lock<std::recursive_mutex>(*runtimeMutex_);
    return job(rt);
  }

  /* #endregion */

  void callMicrotasks() const;

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
#ifndef NDEBUG
  template <typename... Args>
  std::shared_ptr<Serializable> runSyncSerializedWithStack(
      const std::shared_ptr<SerializableWorklet> &worklet,
      const std::optional<std::string> &scheduleStack,
      Args &&...args) const {
    jsi::Runtime &rt = getJSIRuntime();
    auto lock = std::unique_lock<std::recursive_mutex>(*runtimeMutex_);
    auto result = runSyncWithStack(worklet, scheduleStack, std::forward<Args>(args)...);
    auto serializableResult = extractSerializableOrThrow(
        rt,
        result,
        "[Worklets] Worklet passed to `runSyncSerialized`"
        "must return a value serialized with `createSerializable`.");
    return serializableResult;
  }
#endif // NDEBUG
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

  jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &propName) override;

  std::vector<jsi::PropNameID> getPropertyNames(jsi::Runtime &rt) override;

  [[nodiscard]] std::string toString() const noexcept {
    return "[WorkletRuntime \"" + name_ + "\"]";
  }

  [[nodiscard]] jsi::Runtime &getJSIRuntime() const noexcept {
    return *runtime_;
  }

  [[nodiscard]] RuntimeData::RuntimeId getRuntimeId() const noexcept {
    return runtimeId_;
  }

  [[nodiscard]] std::string getRuntimeName() const noexcept {
    return name_;
  }

  explicit WorkletRuntime(
      RuntimeData::RuntimeId runtimeId,
      RuntimeData::RuntimeKind runtimeKind,
      const std::string &name,
      const std::shared_ptr<AsyncQueue> &queue = nullptr,
      bool enableEventLoop = true);

  void init(const std::shared_ptr<JSIWorkletsModuleProxy> &jsiWorkletsModuleProxy);

  /* #region deprecated */

  /** @deprecated Use `runSync` instead. */
  template <typename... Args>
  jsi::Value runGuarded(const std::shared_ptr<SerializableWorklet> &worklet, Args &&...args) const {
    return runSync(worklet, std::forward<Args>(args)...);
  }

  /** @deprecated Use `schedule` instead. */
  void runAsyncGuarded(const std::shared_ptr<SerializableWorklet> &worklet);

  /** @deprecated Use `runSyncSerialized` and extract to `jsi::Value` with
   * `extractSerializableOrThrow` instead. */
  jsi::Value executeSync(jsi::Runtime &rt, const jsi::Value &worklet) const;
  /** @deprecated Use `runSync` instead. */
  jsi::Value executeSync(std::function<jsi::Value(jsi::Runtime &)> &&job) const;
  /** @deprecated Use `runSync` instead. */
  jsi::Value executeSync(const std::function<jsi::Value(jsi::Runtime &)> &job) const;

  /* #endregion */

  /**
   * Retrieves a weak reference to the WorkletRuntime associated with the
   * provided jsi::Runtime.
   *
   * Throws when invoked with a non-worklet runtime.
   *
   * Available only on React Native 0.81 and higher.
   */
  static std::weak_ptr<WorkletRuntime> getWeakRuntimeFromJSIRuntime(jsi::Runtime &rt);

 private:
#ifndef NDEBUG
  // Wraps the provided function in a try/catch so an exception thrown on the
  // worklet runtime can be reported on the RN Runtime LogBox with a
  // stack pointing back to the JS call site that scheduled the worklet.
  template <typename... Args>
  jsi::Value callGuarded(const jsi::Function &function, const std::optional<std::string> &scheduleStack, Args &&...args)
      const {
    auto &rt = *runtime_;
    try {
      return function.call(rt, args...);
    } catch (jsi::JSError &e) {
      JSLogger::handleJSError(jsScheduler_, rt, name_, e, scheduleStack);
      return jsi::Value::undefined();
    }
  }
#endif // NDEBUG

  void bundleModeInit(
      const std::shared_ptr<JSScheduler> &jsScheduler,
      const std::shared_ptr<const ScriptBuffer> &script,
      const std::string &sourceUrl,
      const std::shared_ptr<RuntimeBindings> &runtimeBindings);

  void legacyModeInit(const std::shared_ptr<UnpackerLoader> &unpackerLoader);

  const RuntimeData::RuntimeId runtimeId_;
  const std::shared_ptr<std::recursive_mutex> runtimeMutex_;
  const std::shared_ptr<jsi::Runtime> runtime_;
  std::shared_ptr<JSScheduler> jsScheduler_;
  const RuntimeData::RuntimeKind runtimeKind_;
  const std::string name_;
  std::shared_ptr<AsyncQueue> queue_;
  std::shared_ptr<EventLoop> eventLoop_;
};

// This function needs to be non-inline to avoid problems with dynamic_cast on
// Android
std::shared_ptr<WorkletRuntime> extractWorkletRuntime(jsi::Runtime &rt, const jsi::Value &value);

void scheduleOnRuntime(
    jsi::Runtime &rt,
    const jsi::Value &workletRuntimeValue,
    const jsi::Value &serializableWorkletValue);
#ifndef NDEBUG
void scheduleOnRuntime(
    jsi::Runtime &rt,
    const jsi::Value &workletRuntimeValue,
    const jsi::Value &serializableWorkletValue,
    const std::optional<std::string> &scheduleStack);
#endif // NDEBUG

} // namespace worklets
