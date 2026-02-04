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
#include <worklets/WorkletRuntime/IWorkletRuntime.h>
#include <worklets/WorkletRuntime/RuntimeData.h>

#include <memory>
#include <string>
#include <vector>

using namespace facebook;
using namespace react;

namespace worklets {

/**
 * Forward declaration to avoid circular dependencies.
 */
class JSIWorkletsModuleProxy;

class WorkletRuntime : public IWorkletRuntime,
                       public jsi::HostObject,
                       public std::enable_shared_from_this<WorkletRuntime> {
 public:
  void schedule(jsi::Function &&function) const override;
  void schedule(std::shared_ptr<SerializableWorklet> worklet) const override;
  void schedule(std::function<void()> job) const override;
  void schedule(std::function<void(jsi::Runtime &)> job) const override;

  jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &propName) override;

  std::vector<jsi::PropNameID> getPropertyNames(jsi::Runtime &rt) override;

  [[nodiscard]] std::string toString() const noexcept {
    return "[WorkletRuntime \"" + name_ + "\"]";
  }

  [[nodiscard]] jsi::Runtime &getJSIRuntime() const noexcept override {
    return *runtime_;
  }

  [[nodiscard]] uint64_t getRuntimeId() const noexcept override {
    return runtimeId_;
  }

  [[nodiscard]] std::string getRuntimeName() const noexcept override {
    return name_;
  }

  explicit WorkletRuntime(
      uint64_t runtimeId,
      const std::shared_ptr<MessageQueueThread> &jsQueue,
      const std::string &name,
      const std::shared_ptr<AsyncQueue> &queue = nullptr,
      bool enableEventLoop = true);

  void init(std::shared_ptr<JSIWorkletsModuleProxy> jsiWorkletsModuleProxy);

 private:
  const uint64_t runtimeId_;
  const std::string name_;
  std::shared_ptr<AsyncQueue> queue_;
  std::shared_ptr<EventLoop> eventLoop_;
};

// This function needs to be non-inline to avoid problems with dynamic_cast on
// Android
std::shared_ptr<WorkletRuntime> extractWorkletRuntime(jsi::Runtime &rt, const jsi::Value &value);

} // namespace worklets
