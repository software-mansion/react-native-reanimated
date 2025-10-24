#pragma once

#include <cxxreact/MessageQueueThread.h>
#include <jsi/jsi.h>
#include <jsireact/JSIExecutor.h>
#include <react/debug/react_native_assert.h>

#include <worklets/Public/AsyncQueue.h>
#include <worklets/RunLoop/AsyncQueueImpl.h>
#include <worklets/RunLoop/EventLoop.h>
#include <worklets/SharedItems/Serializable.h>
#include <worklets/Tools/JSScheduler.h>
#include <worklets/WorkletRuntime/RuntimeData.h>

#include <memory>
#include <string>
#include <type_traits>
#include <utility>
#include <vector>

using namespace facebook;
using namespace react;

namespace worklets {

template <typename TCallable>
concept ImplicitlySerializableCallable =
    std::is_assignable_v<const jsi::Function &, TCallable> ||
    std::is_assignable_v<
        const std::shared_ptr<SerializableWorklet> &,
        TCallable>;

template <typename TCallable, typename TReturn = void>
concept RuntimeCallable = ImplicitlySerializableCallable<TCallable> ||
    std::is_assignable_v<const std::function<TReturn(jsi::Runtime &)> &,
                         TCallable>;

/**
 * Forward declaration to avoid circular dependencies.
 */
class JSIWorkletsModuleProxy;

class WorkletRuntime : public jsi::HostObject,
                       public std::enable_shared_from_this<WorkletRuntime> {
 public:
  void schedule(jsi::Function &&function) const;
  void schedule(std::shared_ptr<SerializableWorklet> worklet) const;
  void schedule(std::function<void()> job) const;
  void schedule(std::function<void(jsi::Runtime &)> job) const;

  /* #region runSync */

  template <
      typename TReturn,
      RuntimeCallable<TReturn> TCallable,
      typename... Args>
  jsi::Value inline runSync(TCallable &&callable, Args &&...args) const;
  template <typename... Args>
  jsi::Value inline runSync(const jsi::Function &function, Args &&...args)
      const {
    auto &rt = *runtime_;
    return runOnRuntimeGuarded(rt, function, std::forward<Args>(args)...);
  }
  template <typename... Args>
  jsi::Value inline runSync(
      const std::shared_ptr<SerializableWorklet> &worklet,
      Args &&...args) const {
    jsi::Runtime &rt = *runtime_;
    return runSync(
        worklet->toJSValue(rt).asObject(rt).asFunction(rt),
        std::forward<Args>(args)...);
  }
  template <typename TReturn>
  TReturn inline runSync(
      const std::function<TReturn(jsi::Runtime &)> &job) const {
    jsi::Runtime &rt = getJSIRuntime();
    auto lock = std::unique_lock<std::recursive_mutex>(*runtimeMutex_);
    return job(rt);
  }

  /* #endregion */

  /* #region runSyncSerialized */

  template <ImplicitlySerializableCallable TCallable, typename... Args>
  std::shared_ptr<Serializable> inline runSyncSerialized(
      TCallable &&callable,
      Args &&...args) const;
  template <typename... Args>
  std::shared_ptr<Serializable> inline runSyncSerialized(
      const jsi::Function &function,
      Args &&...args) const {
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
  std::shared_ptr<Serializable> inline runSyncSerialized(
      const std::shared_ptr<SerializableWorklet> &worklet,
      Args &&...args) const {
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

  [[nodiscard]] inline std::string toString() const noexcept {
    return "[WorkletRuntime \"" + name_ + "\"]";
  }

  [[nodiscard]] inline jsi::Runtime &getJSIRuntime() const noexcept {
    return *runtime_;
  }

  [[nodiscard]] inline uint64_t getRuntimeId() const noexcept {
    return runtimeId_;
  }

  [[nodiscard]] inline std::string getRuntimeName() const noexcept {
    return name_;
  }

  explicit WorkletRuntime(
      uint64_t runtimeId,
      const std::shared_ptr<MessageQueueThread> &jsQueue,
      const std::string &name,
      const std::shared_ptr<AsyncQueue> &queue = nullptr,
      bool enableEventLoop = true);

  void init(std::shared_ptr<JSIWorkletsModuleProxy> jsiWorkletsModuleProxy);

  /* #region deprecated */

  /** @deprecated Use `runSync` instead. */
  template <RuntimeCallable TCallable, typename... Args>
  inline jsi::Value runGuarded(TCallable &&callable, Args &&...args) const {
    return runSync(
        std::forward<TCallable>(callable), std::forward<Args>(args)...);
  }

  /** @deprecated Use `schedule` instead. */
  void runAsyncGuarded(const std::shared_ptr<SerializableWorklet> &worklet);

  /** @deprecated Use `runSyncSerialized` and extract to `jsi::Value` with
   * `extractSerializableOrThrow` instead. */
  jsi::Value executeSync(jsi::Runtime &rt, const jsi::Value &worklet) const;
  /** @deprecated Use `runSync` instead. */
  jsi::Value executeSync(std::function<jsi::Value(jsi::Runtime &)> &&job) const;
  /** @deprecated Use `runSync` instead. */
  jsi::Value executeSync(
      const std::function<jsi::Value(jsi::Runtime &)> &job) const;

  /* #endregion */

 private:
  const uint64_t runtimeId_;
  const std::shared_ptr<std::recursive_mutex> runtimeMutex_;
  const std::shared_ptr<jsi::Runtime> runtime_;
  const std::string name_;
  std::shared_ptr<AsyncQueue> queue_;
  std::shared_ptr<EventLoop> eventLoop_;
};

// This function needs to be non-inline to avoid problems with dynamic_cast on
// Android
std::shared_ptr<WorkletRuntime> extractWorkletRuntime(
    jsi::Runtime &rt,
    const jsi::Value &value);

void scheduleOnRuntime(
    jsi::Runtime &rt,
    const jsi::Value &workletRuntimeValue,
    const jsi::Value &serializableWorkletValue);

} // namespace worklets
