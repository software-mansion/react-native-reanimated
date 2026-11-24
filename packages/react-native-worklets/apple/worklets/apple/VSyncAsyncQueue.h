#pragma once

#import <worklets/RunLoop/VSyncAsyncQueue.h>

#import <functional>
#import <memory>
#import <string>

namespace worklets {

struct AppleVSyncAsyncQueueState;

class AppleVSyncAsyncQueue final : public VSyncAsyncQueue {
 public:
  explicit AppleVSyncAsyncQueue(const std::string &name);

  ~AppleVSyncAsyncQueue() override;

  using AsyncQueue::push;

  void push(std::function<void()> &&job) override;

  void abortPending(AbortToken abortToken) override;

  void stop(AbortToken abortToken) override;

  void requestAnimationFrame(std::function<void(double)> &&callback) override;

 private:
  const std::shared_ptr<AppleVSyncAsyncQueueState> state_;
};

} // namespace worklets
