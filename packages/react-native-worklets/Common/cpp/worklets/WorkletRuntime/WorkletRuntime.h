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

#include <cstdint>
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
concept RuntimeCallable = std::is_same_v<std::remove_cvref_t<TCallable>, jsi::Function> ||
    std::is_same_v<std::remove_cvref_t<TCallable>, std::shared_ptr<SerializableWorklet>>;

template <typename TJob>
concept RuntimeJob = !RuntimeCallable<TJob> && requires(TJob &&job, jsi::Runtime &rt) {
  { job(rt) };
};

template <typename TResult>
concept SyncCallResult = std::is_same_v<TResult, jsi::Value> || std::is_same_v<TResult, std::shared_ptr<Serializable>>;

/**
 * Forward declaration to avoid circular dependencies.
 */
class JSIWorkletsModuleProxy;

class WorkletRuntime : public jsi::HostObject, public std::enable_shared_from_this<WorkletRuntime> {
 public:
  /**
   * Schedules a std::function to run asynchronously.
   *
   * Runs a single microtask checkpoint on completion.
   */
  void schedule(std::function<void(jsi::Runtime &)> job) const;

  /**
   * Schedules a jsi::Function to run asynchronously.
   *
   * The jsi::Function has to originate from this runtime, otherwise it will
   crash.
   *
   * Runs a single microtask checkpoint on completion.
   */
  void schedule(jsi::Function &&function) const;

  /**
   * Schedules a serialized worklet to run asynchronously.
   *
   * Runs a single microtask checkpoint on completion.
   */
  void schedule(std::shared_ptr<SerializableWorklet> worklet) const;

  /**
   * Schedules a batch of serialized worklets to run asynchronously.
   *
   * Runs a single microtask checkpoint on completion of the batch.
   */
  void schedule(std::vector<std::shared_ptr<SerializableWorklet>> worklets) const;
#ifndef NDEBUG
  /**
   * Schedules a serialized worklet to run asynchronously on the worklet runtime,
   * remembering the call site that scheduled it for error reporting.
   *
   * Runs a single microtask checkpoint on completion.
   */
  void scheduleWithStack(std::shared_ptr<SerializableWorklet> worklet, std::optional<std::string> scheduleStack) const;

  /**
   * Schedules a batch of serialized worklets to run asynchronously on the
   * worklet runtime, remembering their scheduling call sites for error
   * reporting.
   *
   * Runs a single microtask checkpoint on completion of the batch.
   */
  void scheduleWithStack(
      std::vector<std::shared_ptr<SerializableWorklet>> worklets,
      std::vector<std::optional<std::string>> scheduleStacks) const;
#endif // NDEBUG

  /**
   * Runs a RuntimeJob synchronously and returns its result.
   *
   * Does not run a microtask checkpoint.
   */
  template <RuntimeJob TJob>
  auto runSync(TJob &&job) const -> std::invoke_result_t<TJob, jsi::Runtime &> {
    auto lock = acquireRuntimeLock();
    return runSyncImpl(std::forward<TJob>(job));
  }

  /**
   * Runs a jsi::Function or SerializableWorklet synchronously and returns a
   * jsi::Value result.
   *
   * The returned jsi::Value originates from this runtime and cannot be used on
   * another runtime unless it is a primitive value. Use runSyncSerialized to
   * transfer the result to another runtime.
   *
   * Does not run a microtask checkpoint.
   */
  template <RuntimeCallable TCallable, typename... TArgs>
  auto runSync(const TCallable &callable, TArgs &&...args) const -> jsi::Value {
    auto lock = acquireRuntimeLock();
    return runSyncImpl(callable, std::forward<TArgs>(args)...);
  }

  /**
   * Runs a jsi::Function or SerializableWorklet synchronously and returns its
   * serialized result.
   *
   * Does not run a microtask checkpoint.
   */
  template <RuntimeCallable TCallable, typename... TArgs>
  auto runSyncSerialized(const TCallable &callable, TArgs &&...args) const -> std::shared_ptr<Serializable> {
    auto lock = acquireRuntimeLock();
    return runSyncImpl<MicrotaskCheckpoint::Skip, std::shared_ptr<Serializable>>(
        callable, std::forward<TArgs>(args)...);
  }

  /**
   * Runs a jsi::Function or SerializableWorklet synchronously and returns its
   * serialized result.
   *
   * Runs a single microtask checkpoint on completion.
   */
  template <RuntimeJob TJob>
  auto runSyncAndDrainMicrotasks(TJob &&job) const -> std::invoke_result_t<TJob, jsi::Runtime &> {
    auto lock = acquireRuntimeLock();
    return runSyncImpl<MicrotaskCheckpoint::Run>(std::forward<TJob>(job));
  }

  /**
   * Runs a jsi::Function or SerializableWorklet synchronously and returns a
   * jsi::Value result.
   *
   * The returned jsi::Value originates from this runtime and cannot be used on
   * another runtime unless it is a primitive value. Use
   * runSyncAndDrainMicrotasksSerialized to transfer the result to another
   * runtime.
   *
   * Runs a single microtask checkpoint on completion.
   */
  template <RuntimeCallable TCallable, typename... TArgs>
  auto runSyncAndDrainMicrotasks(const TCallable &callable, TArgs &&...args) const -> jsi::Value {
    auto lock = acquireRuntimeLock();
    return runSyncImpl<MicrotaskCheckpoint::Run>(callable, std::forward<TArgs>(args)...);
  }

  /**
   * Runs a jsi::Function or SerializableWorklet synchronously and returns its
   * serialized result.
   *
   * Runs a single microtask checkpoint on completion.
   */
  template <RuntimeCallable TCallable, typename... TArgs>
  auto runSyncAndDrainMicrotasksSerialized(const TCallable &callable, TArgs &&...args) const
      -> std::shared_ptr<Serializable> {
    auto lock = acquireRuntimeLock();
    return runSyncImpl<MicrotaskCheckpoint::Run, std::shared_ptr<Serializable>>(callable, std::forward<TArgs>(args)...);
  }

#ifndef NDEBUG
  /**
   * Synchronously invokes a jsi::Function or SerializableWorklet on the worklet
   * runtime and returns TResult, remembering the call site that scheduled it
   * for error reporting.
   *
   * TResult must be either jsi::Value or std::shared_ptr<Serializable>.
   *
   * Does not run a microtask checkpoint.
   */
  template <SyncCallResult TResult, RuntimeCallable TCallable, typename... TArgs>
  auto runSyncWithStack(const TCallable &callable, const std::optional<std::string> &scheduleStack, TArgs &&...args)
      const -> TResult {
    auto lock = acquireRuntimeLock();
    return runSyncImpl<MicrotaskCheckpoint::Skip, TResult, ScheduleStack::Requested>(
        callable, scheduleStack, std::forward<TArgs>(args)...);
  }

  /**
   * Synchronously invokes a jsi::Function or SerializableWorklet on the worklet
   * runtime, runs any microtasks it queued, and returns TResult, remembering the
   * call site that scheduled it for error reporting.
   *
   * TResult must be either jsi::Value or std::shared_ptr<Serializable>.
   */
  template <SyncCallResult TResult, RuntimeCallable TCallable, typename... TArgs>
  auto runSyncWithStackAndDrainMicrotasks(
      const TCallable &callable,
      const std::optional<std::string> &scheduleStack,
      TArgs &&...args) const -> TResult {
    auto lock = acquireRuntimeLock();
    return runSyncImpl<MicrotaskCheckpoint::Run, TResult, ScheduleStack::Requested>(
        callable, scheduleStack, std::forward<TArgs>(args)...);
  }
#endif // NDEBUG

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
   */
  static std::weak_ptr<WorkletRuntime> getWeakRuntimeFromJSIRuntime(jsi::Runtime &rt);

  /**
   * Runs the worklet runtime's pending microtasks.
   *
   * The runtime lock is held until the microtask checkpoint completes.
   */
  void drainMicrotasks() const {
    auto lock = acquireRuntimeLock();
    drainMicrotasksImpl();
  }

 private:
  enum class MicrotaskCheckpoint : std::uint8_t {
    Skip,
    Run,
  };

  enum class ScheduleStack : std::uint8_t {
    NotRequested,
#ifndef NDEBUG
    Requested,
#endif // NDEBUG
  };

  struct NoScheduleStack {};

#ifndef NDEBUG
  struct RequestedScheduleStack {
    const std::optional<std::string> &value;
  };
#endif // NDEBUG

  using ScheduledJob = std::function<void(const WorkletRuntime &)>;

  /**
   * Queues a job and acquires the runtime lock immediately before invoking it.
   *
   * Scheduled jobs must use the unlocked implementation methods.
   */
  void scheduleImpl(ScheduledJob job) const;

  /**
   * Assumes the caller acquired the runtime lock.
   */
  template <
      MicrotaskCheckpoint TCheckpoint = MicrotaskCheckpoint::Skip,
      SyncCallResult TResult = jsi::Value,
      ScheduleStack TScheduleStack = ScheduleStack::NotRequested,
      typename TCallable,
      typename... TArgs>
    requires RuntimeJob<TCallable> || RuntimeCallable<TCallable>
  auto runSyncImpl(TCallable &&callable, TArgs &&...args) const -> decltype(auto) {
    jsi::Runtime &rt = getJSIRuntime();
    if constexpr (std::is_same_v<std::remove_cvref_t<TCallable>, std::shared_ptr<SerializableWorklet>>) {
      auto function = callable->toJSValue(rt).getObject(rt).getFunction(rt);
      return runSyncImpl<TCheckpoint, TResult, TScheduleStack>(function, std::forward<TArgs>(args)...);
    } else {
      auto stackPolicyInvocation = [&]<typename TScheduleStackContext, typename... TCallArgs>(
                                       TScheduleStackContext &&scheduleStackContext,
                                       TCallArgs &&...callArgs) -> decltype(auto) {
        auto microtaskPolicyInvocation = [&]() -> decltype(auto) {
          if constexpr (RuntimeJob<TCallable>) {
            return std::forward<TCallable>(callable)(rt);
          } else {
            auto result = this->invoke(
                rt,
                callable,
                std::forward<TScheduleStackContext>(scheduleStackContext),
                std::forward<TCallArgs>(callArgs)...);
            if constexpr (std::is_same_v<TResult, std::shared_ptr<Serializable>>) {
              return extractSerializableOrThrow(rt, result);
            } else {
              return result;
            }
          }
        };

        return invokeWithMicrotaskCheckpointPolicyImpl<TCheckpoint>(std::move(microtaskPolicyInvocation));
      };

      return invokeWithStackPolicyImpl<TScheduleStack, TCallable>(
          std::move(stackPolicyInvocation), std::forward<TArgs>(args)...);
    }
  }

  /**
   * Assumes the caller acquired the runtime lock.
   */
  template <ScheduleStack TScheduleStack, typename TCallable, typename TInvoker, typename... TArgs>
  static auto invokeWithStackPolicyImpl(TInvoker &&invoke, TArgs &&...args) -> decltype(auto) {
#ifndef NDEBUG
    if constexpr (TScheduleStack == ScheduleStack::Requested) {
      static_assert(RuntimeCallable<TCallable>, "[Worklets] Scheduling stacks can be used only with worklet calls.");
      static_assert(sizeof...(TArgs) > 0, "[Worklets] A scheduling stack argument is required.");
      return [&]<typename TScheduleStackArg, typename... TCallArgs>(
                 TScheduleStackArg &&scheduleStack, TCallArgs &&...callArgs) -> decltype(auto) {
        static_assert(
            std::is_same_v<std::remove_cvref_t<TScheduleStackArg>, std::optional<std::string>>,
            "[Worklets] The first argument must be an optional scheduling stack.");
        return std::forward<TInvoker>(invoke)(
            RequestedScheduleStack{std::forward<TScheduleStackArg>(scheduleStack)},
            std::forward<TCallArgs>(callArgs)...);
      }(std::forward<TArgs>(args)...);
    } else
#endif // NDEBUG
    {
      return std::forward<TInvoker>(invoke)(NoScheduleStack{}, std::forward<TArgs>(args)...);
    }
  }

  /**
   * Assumes the caller acquired the runtime lock.
   */
  template <MicrotaskCheckpoint TCheckpoint, typename TInvoker>
  auto invokeWithMicrotaskCheckpointPolicyImpl(TInvoker &&invoke) const -> std::invoke_result_t<TInvoker> {
    using Result = std::invoke_result_t<TInvoker>;
    const auto checkpoint = [&]() {
      if constexpr (TCheckpoint == MicrotaskCheckpoint::Run) {
        drainMicrotasksImpl();
      }
    };
    if constexpr (std::is_void_v<Result>) {
      std::forward<TInvoker>(invoke)();
      checkpoint();
    } else {
      Result result = std::forward<TInvoker>(invoke)();
      checkpoint();
      return std::forward<Result>(result);
    }
  }

  /**
   * Assumes the caller acquired the runtime lock.
   */
  void drainMicrotasksImpl() const {
    if (microtaskQueueEnabled_) {
      jsi_utils::drainMicrotasks(getJSIRuntime());
    }
  }

  /**
   * Invokes the provided function, reporting any exception with the scheduling
   * stack carried by the provided stack context in debug builds.
   */
  template <typename TScheduleStackContext, typename... TArgs>
  jsi::Value invoke(
      jsi::Runtime &rt,
      const jsi::Function &function,
      const TScheduleStackContext &scheduleStackContext,
      TArgs &&...args) const {
#ifndef NDEBUG
    try {
      return function.call(rt, std::forward<TArgs>(args)...);
    } catch (jsi::JSError &e) {
      if constexpr (std::is_same_v<TScheduleStackContext, RequestedScheduleStack>) {
        JSLogger::handleJSError(jsScheduler_, rt, name_, e, scheduleStackContext.value);
      } else {
        JSLogger::handleJSError(jsScheduler_, rt, name_, e, std::nullopt);
      }
      return jsi::Value::undefined();
    }
#else
    return function.call(rt, std::forward<TArgs>(args)...);
#endif // NDEBUG
  }

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
  const bool microtaskQueueEnabled_;
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
