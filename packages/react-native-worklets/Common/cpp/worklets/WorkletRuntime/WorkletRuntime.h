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
   * Schedules a JSI function to run asynchronously on the worklet runtime.
   */
  void schedule(jsi::Function &&function) const;

  /**
   * Schedules a serialized worklet to run asynchronously on the worklet runtime.
   */
  void schedule(std::shared_ptr<SerializableWorklet> worklet) const;
#ifndef NDEBUG
  /**
   * Schedules a serialized worklet to run asynchronously on the worklet runtime,
   * remembering the call site that scheduled it for error reporting.
   */
  void schedule(std::shared_ptr<SerializableWorklet> worklet, std::optional<std::string> scheduleStack) const;
#endif // NDEBUG

  /**
   * Schedules a job to run asynchronously on the worklet runtime. The job does
   * not receive the runtime.
   */
  void schedule(std::function<void()> job) const;

  /**
   * Schedules a job to run asynchronously on the worklet runtime, passing it the
   * runtime.
   */
  void schedule(std::function<void(jsi::Runtime &)> job) const;

  /**
   * Synchronously invokes a JSI function on the worklet runtime and returns its
   * result.
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
   * Synchronously invokes a serialized worklet on the worklet runtime and
   * returns its result, remembering the call site that scheduled it for error
   * reporting.
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
   * Synchronously invokes a serialized worklet on the worklet runtime and
   * returns its result.
   */
  template <SyncCallResult TResult = jsi::Value, typename... Args>
  TResult runSync(const std::shared_ptr<SerializableWorklet> &worklet, Args &&...args) const {
    return runSyncWithStack<TResult>(worklet, std::nullopt, std::forward<Args>(args)...);
  }

  /**
   * Synchronously runs a callback on the worklet runtime, passing it the
   * runtime, and returns its result.
   */
  template <RuntimeCallable TCallable>
  std::invoke_result_t<TCallable, jsi::Runtime &> runSync(TCallable &&job) const {
    auto lock = acquireRuntimeLock();
    jsi::Runtime &rt = getJSIRuntime();
    return job(rt);
  }

  /**
   * Synchronously invokes a serialized worklet on the worklet runtime, runs any
   * microtasks it queued, and returns its result.
   */
  template <SyncCallResult TResult = jsi::Value, typename... Args>
  TResult runSyncAndDrainMicrotasks(const std::shared_ptr<SerializableWorklet> &worklet, Args &&...args) const {
    return runSyncWithStackAndDrainMicrotasks<TResult>(worklet, std::nullopt, std::forward<Args>(args)...);
  }

  /**
   * Synchronously runs a function or callback on the worklet runtime and runs
   * any microtasks it queued.
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
   * Synchronously invokes a serialized worklet on the worklet runtime, runs any
   * microtasks it queued, and returns its result, remembering the call site that
   * scheduled it for error reporting.
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

  /**
   * Runs the worklet runtime's pending microtasks.
   */
  void drainMicrotasks() const {
    runSync([](jsi::Runtime &rt) {
      auto callMicrotasks = rt.global().getProperty(rt, "__callMicrotasks");
      if (callMicrotasks.isObject()) {
        auto callMicrotasksObject = callMicrotasks.asObject(rt);
        if (callMicrotasksObject.isFunction(rt)) {
          callMicrotasksObject.asFunction(rt).call(rt);
        }
      }
    });
  }

 private:
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
