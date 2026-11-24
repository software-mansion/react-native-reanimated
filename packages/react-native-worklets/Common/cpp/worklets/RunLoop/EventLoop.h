#pragma once

#include <jsi/jsi.h>
#include <worklets/RunLoop/AsyncQueue.h>
#include <worklets/RunLoop/RuntimeTaskState.h>

#include <atomic>
#include <condition_variable>
#include <memory>
#include <mutex>
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
      AbortToken abortToken,
      const std::shared_ptr<jsi::Runtime> &runtime,
      const std::shared_ptr<AsyncQueue> &queue,
      const std::shared_ptr<std::recursive_mutex> &runtimeMutex,
      const std::shared_ptr<RuntimeTaskState> &taskState);
  ~EventLoop();
  void run();
  void pushTask(std::function<void(jsi::Runtime &rt)> &&job);
  void runTask(const std::function<void(jsi::Runtime &rt)> &job);
  void pushTimeout(std::function<void(jsi::Runtime &rt)> &&job, int64_t delay);
  void abortPending();

  using FrameRequester = std::function<void(std::function<void(double)> &&onFrame)>;
  void setFrameSource(FrameRequester &&requestFrame, bool deliversOnRuntimeThread);

 private:
  const AbortToken abortToken_;
  const std::shared_ptr<jsi::Runtime> runtime_;
  const std::shared_ptr<AsyncQueue> queue_;
  const std::shared_ptr<std::recursive_mutex> runtimeMutex_;
  const std::shared_ptr<RuntimeTaskState> taskState_;
  const std::shared_ptr<TimeoutsQueueState> timeoutsQueueState_;
  const std::string name_;

  void deferToNextFrame(std::vector<std::function<void(jsi::Runtime &rt)>> &&jobs);
  void requestFrame();
  void runFrameTimeouts();

  FrameRequester requestFrame_;
  bool deliversOnRuntimeThread_ = false;
  std::mutex frameTimeoutsMutex_;
  std::vector<std::function<void(jsi::Runtime &rt)>> frameTimeouts_;
  bool frameRequested_ = false;

  static int64_t getCurrentTimeInMs();
};

} // namespace worklets
