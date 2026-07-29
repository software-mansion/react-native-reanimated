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
#include <worklets/Tools/WorkletsJSIUtils.h>
#include <worklets/WorkletRuntime/RuntimeBindings.h>
#include <worklets/WorkletRuntime/RuntimeData.h>

#include <memory>
#include <mutex>
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

template <typename TResult>
concept SyncCallResult = std::is_same_v<TResult, jsi::Value> || std::is_same_v<TResult, std::shared_ptr<Serializable>>;

/**
 * Forward declaration to avoid circular dependencies.
 */
class JSIWorkletsModuleProxy;

class WorkletRuntime : public jsi::HostObject, public std::enable_shared_from_this<WorkletRuntime> {
 public:
  /**
   * Schedules a JSI function for asynchronous execution.
   *
   * Both the Worklets and Hermes microtask queues are drained after the
   * function completes.
   */
  void schedule(jsi::Function &&function) const;

  /**
   * Schedules a serialized worklet for asynchronous execution.
   *
   * Both the Worklets and Hermes microtask queues are drained after the
   * worklet completes.
   */
  void schedule(std::shared_ptr<SerializableWorklet> worklet) const;
#ifndef NDEBUG
  /**
   * Schedules a serialized worklet for asynchronous execution with stack
   * metadata.
   *
   * Both the Worklets and Hermes microtask queues are drained after the
   * worklet completes.
   */
  void schedule(std::shared_ptr<SerializableWorklet> worklet, std::optional<std::string> scheduleStack) const;
#endif // NDEBUG

  /**
   * Schedules a non-JSI job for asynchronous execution.
   *
   * This overload does not execute JavaScript and therefore does not drain
   * microtasks.
   */
  void schedule(std::function<void()> job) const;

  /**
   * Schedules a runtime callback for asynchronous execution.
   *
   * Both the Worklets and Hermes microtask queues are drained after the
   * callback completes.
   */
  void schedule(std::function<void(jsi::Runtime &)> job) const;

  /**
   * Executes a JSI function synchronously on the worklet runtime.
   *
   * This method does not drain either the Worklets or Hermes microtask queues.
   * The caller is responsible for invoking `drainMicrotasks()` when needed.
   */
  template <typename... Args>
  jsi::Value runSync(const jsi::Function &function, Args &&...args) const {
#ifndef NDEBUG
    return callGuarded(function, std::forward<Args>(args)...);
#else
    return function.call(*runtime_, args...);
#endif // NDEBUG
  }

  /**
   * Executes a serialized worklet synchronously on the worklet runtime.
   *
   * In debug builds `scheduleStack` is attached to the guarded call so an
   * exception thrown by the worklet can be reported with the JS call site that
   * scheduled it; in release builds it is ignored.
   *
   * This method does not drain either the Worklets or Hermes microtask queues.
   * The caller is responsible for invoking `drainMicrotasks()` when needed.
   */
  template <SyncCallResult TResult = jsi::Value, typename... Args>
  TResult runSyncWithStack(
      const std::shared_ptr<SerializableWorklet> &worklet,
      const std::optional<std::string> &scheduleStack,
      Args &&...args) const {
    jsi::Runtime &rt = *runtime_;
    auto function = worklet->toJSValue(rt).getObject(rt).getFunction(rt);
#ifndef NDEBUG
    auto result = callGuardedWithStack(function, scheduleStack, std::forward<Args>(args)...);
#else
    (void)scheduleStack;
    auto result = function.call(rt, args...);
#endif // NDEBUG
    if constexpr (std::is_same_v<TResult, std::shared_ptr<Serializable>>) {
      return extractSerializableOrThrow(rt, result);
    } else {
      return result;
    }
  }

  /**
   * Executes a serialized worklet synchronously on the worklet runtime.
   *
   * This method does not drain either the Worklets or Hermes microtask queues.
   * The caller is responsible for invoking `drainMicrotasks()` when needed.
   */
  template <SyncCallResult TResult = jsi::Value, typename... Args>
  TResult runSync(const std::shared_ptr<SerializableWorklet> &worklet, Args &&...args) const {
    return runSyncWithStack<TResult>(worklet, std::nullopt, std::forward<Args>(args)...);
  }

  template <RuntimeCallable TCallable>
  std::invoke_result_t<TCallable, jsi::Runtime &> runSync(TCallable &&job) const {
    auto lock = acquireRuntimeLock();
    jsi::Runtime &rt = getJSIRuntime();
    return job(rt);
  }

  /**
   * Executes a serialized worklet synchronously and drains microtasks before
   * releasing the runtime lock.
   */
  template <SyncCallResult TResult = jsi::Value, typename... Args>
  TResult runSyncAndDrainMicrotasks(const std::shared_ptr<SerializableWorklet> &worklet, Args &&...args) const {
    auto lock = acquireRuntimeLock();
    auto result = runSync<TResult>(worklet, std::forward<Args>(args)...);
    drainMicrotasks();
    return result;
  }

  /**
   * Executes a callable or JSI function synchronously and drains microtasks
   * before releasing the runtime lock.
   */
  template <typename... Args>
  auto runSyncAndDrainMicrotasks(Args &&...args) const {
    auto lock = acquireRuntimeLock();
    using Result = decltype(runSync(std::forward<Args>(args)...));
    if constexpr (std::is_void_v<Result>) {
      runSync(std::forward<Args>(args)...);
      drainMicrotasks();
    } else {
      auto result = runSync(std::forward<Args>(args)...);
      drainMicrotasks();
      return result;
    }
  }

  /**
   * Executes a serialized worklet synchronously with scheduling stack metadata
   * and drains microtasks before releasing the runtime lock.
   */
  template <SyncCallResult TResult = jsi::Value, typename... Args>
  TResult runSyncWithStackAndDrainMicrotasks(
      const std::shared_ptr<SerializableWorklet> &worklet,
      const std::optional<std::string> &scheduleStack,
      Args &&...args) const {
    auto lock = acquireRuntimeLock();
    auto result = runSyncWithStack<TResult>(worklet, scheduleStack, std::forward<Args>(args)...);
    drainMicrotasks();
    return result;
  }

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

  [[nodiscard]] bool isLockingEnabled() const noexcept {
    return enableLocking_;
  }

  explicit WorkletRuntime(
      RuntimeData::RuntimeId runtimeId,
      RuntimeData::RuntimeKind runtimeKind,
      const std::string &name,
      const std::shared_ptr<AsyncQueue> &queue = nullptr,
      bool enableEventLoop = true,
      bool enableLocking = true);

  void init(const std::shared_ptr<JSIWorkletsModuleProxy> &jsiWorkletsModuleProxy);

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
  void drainMicrotasks() const {
    runSync([](jsi::Runtime &rt) { jsi_utils::drainMicrotasks(rt); });
  }

#ifndef NDEBUG
  /**
   * Wraps the provided function in a try/catch so an exception thrown on the
   * worklet runtime can be reported on the RN Runtime LogBox with a
   * stack pointing back to the JS call site that scheduled the worklet.
   */
  template <typename... Args>
  jsi::Value callGuardedWithStack(
      const jsi::Function &function,
      const std::optional<std::string> &scheduleStack,
      Args &&...args) const {
    auto &rt = *runtime_;
    try {
      return function.call(rt, args...);
    } catch (jsi::JSError &e) {
      JSLogger::handleJSError(jsScheduler_, rt, name_, e, scheduleStack);
      return jsi::Value::undefined();
    }
  }

  /**
   * Wraps the provided function in a try/catch, reporting any exception without a
   * scheduling stack.
   */
  template <typename... Args>
  jsi::Value callGuarded(const jsi::Function &function, Args &&...args) const {
    return callGuardedWithStack(function, std::nullopt, std::forward<Args>(args)...);
  }
#endif // NDEBUG

  void bundleModeInit(
      const std::shared_ptr<JSScheduler> &jsScheduler,
      const std::shared_ptr<const ScriptBuffer> &script,
      const std::string &sourceUrl,
      const std::shared_ptr<RuntimeBindings> &runtimeBindings);

  void legacyModeInit(const std::shared_ptr<UnpackerLoader> &unpackerLoader);

  [[nodiscard]] std::unique_lock<std::recursive_mutex> acquireRuntimeLock() const {
    if (enableLocking_) {
      return std::unique_lock<std::recursive_mutex>(*runtimeMutex_);
    }
    return {};
  }

  const RuntimeData::RuntimeId runtimeId_;
  const bool enableLocking_;
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
