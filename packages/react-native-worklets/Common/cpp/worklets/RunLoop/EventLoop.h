#pragma once

#include <jsi/jsi.h>
#include <worklets/Public/AsyncQueue.h>

#include <atomic>
#include <condition_variable>
#include <memory>
#include <queue>
#include <string>
#include <vector>

using namespace facebook;

namespace worklets {

struct Timeout {
  std::function<void(jsi::Runtime &rt)> callback;
  int64_t targetTime;
  bool operator<(const Timeout &v) const {
    return targetTime < v.targetTime;
  }
};

struct TimeoutsQueueState {
  std::atomic_bool running{true};
  std::mutex mutex;
  std::condition_variable cv;
  std::vector<Timeout> queue;
};

class EventLoop : public std::enable_shared_from_this<EventLoop> {
 public:
  EventLoop(
      const std::string &name,
      const std::shared_ptr<jsi::Runtime> runtime,
      const std::shared_ptr<AsyncQueue> &queue);
  ~EventLoop();
  void run();
  void pushTask(std::function<void(jsi::Runtime &rt)> &&job);
  void pushTimeout(std::function<void(jsi::Runtime &rt)> &&job, int64_t delay);

 private:
  const std::shared_ptr<jsi::Runtime> runtime_;
  const std::shared_ptr<AsyncQueue> queue_;
  const std::shared_ptr<TimeoutsQueueState> timeoutsQueueState_;
  const std::string name_;

  static int64_t getCurrentTimeInMs();
};

} // namespace worklets
