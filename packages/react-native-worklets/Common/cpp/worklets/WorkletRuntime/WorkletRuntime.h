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
#include <utility>
#include <vector>

using namespace facebook;
using namespace react;

namespace worklets {

/**
 * Forward declaration to avoid circular dependencies.
 */
class JSIWorkletsModuleProxy;

class WorkletRuntime : public jsi::HostObject,
                       public std::enable_shared_from_this<WorkletRuntime> {
 public:
  explicit WorkletRuntime(
      uint64_t runtimeId,
      const std::shared_ptr<MessageQueueThread> &jsQueue,
      const std::string &name,
      const std::shared_ptr<AsyncQueue> &queue = nullptr,
      bool enableEventLoop = true);

  void init(std::shared_ptr<JSIWorkletsModuleProxy> jsiWorkletsModuleProxy);

  jsi::Runtime &getJSIRuntime() const {
    return *runtime_;
  }

  template <typename... Args>
  inline jsi::Value runGuarded(
      const std::shared_ptr<SerializableWorklet> &serializableWorklet,
      Args &&...args) const {
    jsi::Runtime &rt = *runtime_;
    return runOnRuntimeGuarded(
        rt, serializableWorklet->toJSValue(rt), std::forward<Args>(args)...);
  }

  void runAsyncGuarded(const std::shared_ptr<SerializableWorklet> &worklet);

  jsi::Value executeSync(jsi::Runtime &rt, const jsi::Value &worklet) const;

  jsi::Value executeSync(std::function<jsi::Value(jsi::Runtime &)> &&job) const;

  jsi::Value executeSync(
      const std::function<jsi::Value(jsi::Runtime &)> &job) const;

  std::string toString() const {
    return "[WorkletRuntime \"" + name_ + "\"]";
  }

  jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &propName) override;

  std::vector<jsi::PropNameID> getPropertyNames(jsi::Runtime &rt) override;

  [[nodiscard]] auto getRuntimeId() const -> uint64_t {
    return runtimeId_;
  }

  [[nodiscard]] auto getRuntimeName() const -> std::string {
    return name_;
  }

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
