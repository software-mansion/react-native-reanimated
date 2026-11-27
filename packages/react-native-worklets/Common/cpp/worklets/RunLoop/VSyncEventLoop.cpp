#include <worklets/RunLoop/VSyncEventLoop.h>

#include <memory>
#include <string>
#include <utility>
#include <vector>

namespace worklets {

VSyncEventLoop::VSyncEventLoop(
    const std::string &name,
    const AbortToken abortToken,
    const std::shared_ptr<jsi::Runtime> &runtime,
    const std::shared_ptr<AsyncQueue> &queue,
    const std::shared_ptr<std::recursive_mutex> &runtimeMutex,
    const std::shared_ptr<RuntimeTaskState> &taskState,
    FrameRequester &&requestFrame)
    : EventLoop(name, abortToken, runtime, queue, runtimeMutex, taskState), requestFrame_(std::move(requestFrame)) {}

void VSyncEventLoop::runOnNextFrame(std::function<void(jsi::Runtime &rt, double timestampMs)> &&job) {
  requestFrame_([weakThis = weakSelf(), job = std::move(job)](const double timestampMs) {
    if (const auto strongThis = weakThis.lock()) {
      strongThis->runTask([&job, timestampMs](jsi::Runtime &rt) { job(rt, timestampMs); });
    }
  });
}

void VSyncEventLoop::releaseDueTimeouts(std::vector<Timeout> &&dueTimeouts) {
  std::vector<std::function<void(jsi::Runtime & rt)>> frameAlignedTimeouts;
  for (auto &timeout : dueTimeouts) {
    if (timeout.immediate) {
      pushTask(std::move(timeout.callback));
    } else {
      frameAlignedTimeouts.push_back(std::move(timeout.callback));
    }
  }
  if (frameAlignedTimeouts.empty()) {
    return;
  }
  bool shouldRequestFrame = false;
  {
    std::lock_guard<std::mutex> lock(frameTimeoutsMutex_);
    for (auto &timeout : frameAlignedTimeouts) {
      frameTimeouts_.push_back(std::move(timeout));
    }
    shouldRequestFrame = !frameRequested_;
    frameRequested_ = true;
  }
  if (shouldRequestFrame) {
    pushTask([weakThis = weakSelf()](jsi::Runtime &) {
      if (const auto strongThis = weakThis.lock()) {
        strongThis->requestFrame_([weakThis](double) {
          if (const auto strongThis = weakThis.lock()) {
            strongThis->runFrameTimeouts();
          }
        });
      }
    });
  }
}

void VSyncEventLoop::runFrameTimeouts() {
  std::vector<std::function<void(jsi::Runtime & rt)>> timeouts;
  {
    std::lock_guard<std::mutex> lock(frameTimeoutsMutex_);
    std::swap(timeouts, frameTimeouts_);
    frameRequested_ = false;
  }
  for (const auto &timeout : timeouts) {
    runTask(timeout);
  }
}

std::weak_ptr<VSyncEventLoop> VSyncEventLoop::weakSelf() {
  return std::static_pointer_cast<VSyncEventLoop>(shared_from_this());
}

} // namespace worklets
