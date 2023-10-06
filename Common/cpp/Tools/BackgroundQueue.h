#pragma once

#include <jsi/jsi.h>

#include "WorkletRuntime.h"

#include <atomic>
#include <condition_variable>
#include <memory>
#include <queue>
#include <string>
#include <thread>
#include <utility>
#include <vector>

using namespace facebook;
using namespace react;

namespace reanimated {

class BackgroundQueue : public jsi::HostObject {
 public:
  explicit BackgroundQueue(const std::string &name);

  ~BackgroundQueue() override;

  std::string toString() const {
    return "[BackgroundQueue \"" + name_ + "\"]";
  }

  jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &propName) override;

  std::vector<jsi::PropNameID> getPropertyNames(jsi::Runtime &rt) override;

  void push(
      const std::shared_ptr<WorkletRuntime> &runtime,
      const std::shared_ptr<ShareableWorklet> &worklet);

 private:
  void runLoop();

  const std::string name_;
  std::thread thread_;
  std::atomic_bool running_{true};
  std::mutex mutex_;
  std::condition_variable cv_;
  std::queue<std::pair<
      std::shared_ptr<WorkletRuntime>,
      std::shared_ptr<ShareableWorklet>>>
      queue_;
};

std::shared_ptr<BackgroundQueue> extractBackgroundQueue(
    jsi::Runtime &rt,
    const jsi::Value &value);

} // namespace reanimated
