#pragma once

#include <cxxreact/MessageQueueThread.h>
#include <jsi/jsi.h>

#include <worklets/SharedItems/Shareables.h>
#include <worklets/Tools/AsyncQueue.h>
#include <worklets/Tools/JSScheduler.h>

#include <memory>
#include <string>
#include <utility>
#include <vector>

using namespace facebook;
using namespace react;

namespace worklets {

class WorkletRuntime : public jsi::HostObject,
                       public std::enable_shared_from_this<WorkletRuntime> {
 public:
  explicit WorkletRuntime(
      jsi::Runtime &rnRuntime,
      const std::shared_ptr<MessageQueueThread> &jsQueue,
      const std::shared_ptr<JSScheduler> &jsScheduler,
      const std::string &name,
      const bool supportsLocking,
      const std::string &valueUnpackerCode);

  jsi::Runtime &getJSIRuntime() const {
    return *runtime_;
  }

  template <typename... Args>
  inline jsi::Value runGuarded(
      const std::shared_ptr<ShareableWorklet> &shareableWorklet,
      Args &&...args) const {
    jsi::Runtime &rt = *runtime_;
    return runOnRuntimeGuarded(
        rt, shareableWorklet->toJSValue(rt), std::forward<Args>(args)...);
  }

  void runAsyncGuarded(
      const std::shared_ptr<ShareableWorklet> &shareableWorklet) {
    if (queue_ == nullptr) {
      queue_ = std::make_shared<AsyncQueue>(name_);
    }
    queue_->push(
        [=, self = shared_from_this()] { self->runGuarded(shareableWorklet); });
  }

  jsi::Value executeSync(jsi::Runtime &rt, const jsi::Value &worklet) const;

  std::string toString() const {
    return "[WorkletRuntime \"" + name_ + "\"]";
  }

  jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &propName) override;

  std::vector<jsi::PropNameID> getPropertyNames(jsi::Runtime &rt) override;

 private:
  const std::shared_ptr<std::recursive_mutex> runtimeMutex_;
  const std::shared_ptr<jsi::Runtime> runtime_;
#ifndef NDEBUG
  const bool supportsLocking_;
#endif
  const std::string name_;
  std::shared_ptr<AsyncQueue> queue_;
};

// This function needs to be non-inline to avoid problems with dynamic_cast on
// Android
std::shared_ptr<WorkletRuntime> extractWorkletRuntime(
    jsi::Runtime &rt,
    const jsi::Value &value);

void scheduleOnRuntime(
    jsi::Runtime &rt,
    const jsi::Value &workletRuntimeValue,
    const jsi::Value &shareableWorkletValue);

} // namespace worklets
