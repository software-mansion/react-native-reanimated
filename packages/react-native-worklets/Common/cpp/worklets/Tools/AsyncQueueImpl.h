#pragma once

#include <jsi/jsi.h>
#include <worklets/Public/AsyncQueue.h>
#include <worklets/Tools/UIScheduler.h>

#include <atomic>
#include <condition_variable>
#include <memory>
#include <queue>
#include <string>
#include <vector>

namespace worklets {

struct Timeout {
  std::function<void()> callback;
  long long targetTime;
};

struct TimeoutsQueueState {
  std::atomic_bool running{true};
  std::mutex mutex;
  std::condition_variable cv;
  std::vector<Timeout> queue;
};

struct AsyncQueueState {
  std::atomic_bool running{true};
  std::mutex mutex;
  std::condition_variable cv;
  std::queue<std::function<void()>> queue;
  std::queue<std::function<void()>> priorityQueue;
};

class AsyncQueueImpl : public AsyncQueue {
 public:
  explicit AsyncQueueImpl(std::string name);

  ~AsyncQueueImpl() override;

  void push(std::function<void()> &&job) override;
  void pushPriority(std::function<void()> &&job) override;
  void pushTimeout(std::function<void()> &&job, int64_t delay) override;

 private:
  const std::shared_ptr<AsyncQueueState> state_;
  const std::shared_ptr<TimeoutsQueueState> timeoutsQueueState_;
  int64_t getCurrentTimeInMs();
  void startMainRunLoopThread(const std::string &name);
  void startTimeoutRunLoopThread(const std::string &name);
};

class AsyncQueueUI : public AsyncQueue {
 public:
  explicit AsyncQueueUI(const std::shared_ptr<UIScheduler> &uiScheduler);

  ~AsyncQueueUI() override = default;

  void push(std::function<void()> &&job) override;

 private:
  std::shared_ptr<UIScheduler> uiScheduler_;
};

} // namespace worklets
