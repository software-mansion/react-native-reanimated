#pragma once

#include <jsi/jsi.h>
#include <worklets/RunLoop/AsyncQueue.h>
#include <worklets/Tools/UIScheduler.h>

#include <atomic>
#include <condition_variable>
#include <memory>
#include <queue>
#include <string>

namespace worklets {

struct AsyncQueueState {
  std::atomic_bool running{true};
  std::mutex mutex;
  std::condition_variable cv;
  std::queue<std::function<void()>> queue;
};

class AsyncQueueImpl : public AsyncQueue {
 public:
  explicit AsyncQueueImpl(const std::string &name);

  ~AsyncQueueImpl() override;

  void push(std::function<void()> &&job) override;

 private:
  const std::shared_ptr<AsyncQueueState> state_;
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
