#pragma once

#include <jsi/jsi.h>

#include <atomic>
#include <condition_variable>
#include <memory>
#include <queue>
#include <string>
#include <thread>
#include <utility>
#include <vector>

namespace reanimated {

class BackgroundQueue {
 public:
  explicit BackgroundQueue(const std::string &name);

  ~BackgroundQueue();

  void push(std::function<void()> &&job);

 private:
  void runLoop();

  const std::string name_;
  std::atomic_bool running_{true};
  std::mutex mutex_;
  std::condition_variable cv_;
  std::queue<std::function<void()>> queue_;
};

} // namespace reanimated
