#include <worklets/RunLoop/EventLoop.h>

#include <memory>
#include <string>
#include <thread>
#include <utility>
#include <vector>

namespace worklets {

EventLoop::EventLoop(
    const std::string &name,
    const AbortToken abortToken,
    const std::shared_ptr<jsi::Runtime> &runtime,
    const std::shared_ptr<AsyncQueue> &queue,
    const std::shared_ptr<std::recursive_mutex> &runtimeMutex,
    const std::shared_ptr<RuntimeTaskState> &taskState)
    : abortToken_(abortToken),
      runtime_(runtime),
      queue_(queue),
      runtimeMutex_(runtimeMutex),
      taskState_(taskState),
      timeoutsQueueState_(std::make_shared<TimeoutsQueueState>()),
      name_(name) {}

EventLoop::~EventLoop() {
  {
    std::unique_lock<std::mutex> lock(timeoutsQueueState_->mutex);
    timeoutsQueueState_->running = false;
    timeoutsQueueState_->queue = {};
  }
  timeoutsQueueState_->cv.notify_all();
}

void EventLoop::run() {
  const auto threadName = name_ + "(timeout)";
  auto thread = std::thread([threadName, state = timeoutsQueueState_, weakThis = weak_from_this()] {
#if __APPLE__
    pthread_setname_np(threadName.c_str());
#endif
    while (state->running) {
      std::unique_lock<std::mutex> lock(state->mutex);

      if (state->queue.empty()) {
        state->cv.wait(lock);
      } else {
        const auto &nextTimeout = state->queue[0];
        const auto timeToWait = nextTimeout.targetTime - getCurrentTimeInMs();
        state->cv.wait_for(lock, std::chrono::milliseconds(timeToWait));
      }

      // Early return if the Event Loop got destroyed already.
      if (!state->running) {
        return;
      }

      const auto currentTime = getCurrentTimeInMs();
      std::vector<std::function<void(jsi::Runtime & rt)>> jobs;
      std::vector<std::function<void(jsi::Runtime & rt)>> frameAlignedJobs;
      auto &timeouts = state->queue;
      timeouts.erase(
          std::remove_if(
              timeouts.begin(),
              timeouts.end(),
              [currentTime, &jobs, &frameAlignedJobs](const Timeout &timeout) {
                if (currentTime >= timeout.targetTime) {
                  (timeout.frameAligned ? frameAlignedJobs : jobs).emplace_back(timeout.callback);
                  return true;
                }
                return false;
              }),
          timeouts.end());
      lock.unlock();

      if (auto strongThis = weakThis.lock()) {
        for (auto &job : jobs) {
          strongThis->pushTask(std::move(job));
        }
        if (!frameAlignedJobs.empty()) {
          strongThis->deferToNextFrame(std::move(frameAlignedJobs));
        }
      }
    }
  });
#ifdef ANDROID
  pthread_setname_np(thread.native_handle(), threadName.c_str());
#endif
  thread.detach();
}

void EventLoop::pushTask(std::function<void(jsi::Runtime &rt)> &&job) {
  queue_->push(
      [weakRuntime = std::weak_ptr<jsi::Runtime>{runtime_},
       runtimeMutex = runtimeMutex_,
       taskState = taskState_,
       state = timeoutsQueueState_,
       job = std::move(job)] {
        if (auto runtime = weakRuntime.lock()) {
          std::unique_lock lock(*runtimeMutex);
          if (!state->running) [[unlikely]] {
            return;
          }
          taskState->rootTaskRunning = true;
          taskState->rootTaskId++;
          job(*runtime);
          runtime->drainMicrotasks();
          taskState->microtaskCheckpointRequested = false;
          taskState->rootTaskRunning = false;
        }
      },
      abortToken_);
}

void EventLoop::runTask(const std::function<void(jsi::Runtime &rt)> &job) {
  std::unique_lock lock(*runtimeMutex_);
  if (!timeoutsQueueState_->running) [[unlikely]] {
    return;
  }
  taskState_->rootTaskRunning = true;
  taskState_->rootTaskId++;
  job(*runtime_);
  runtime_->drainMicrotasks();
  taskState_->microtaskCheckpointRequested = false;
  taskState_->rootTaskRunning = false;
}

void EventLoop::abortPending() {
  std::vector<Timeout> pendingTimeouts;
  {
    std::unique_lock<std::mutex> lock(timeoutsQueueState_->mutex);
    timeoutsQueueState_->running = false;
    std::swap(pendingTimeouts, timeoutsQueueState_->queue);
  }
  timeoutsQueueState_->cv.notify_all();
}

void EventLoop::setFrameSource(FrameRequester &&requestFrame, bool deliversOnRuntimeThread) {
  std::lock_guard<std::mutex> lock(frameTimeoutsMutex_);
  requestFrame_ = std::move(requestFrame);
  deliversOnRuntimeThread_ = deliversOnRuntimeThread;
}

void EventLoop::deferToNextFrame(std::vector<std::function<void(jsi::Runtime &rt)>> &&jobs) {
  bool shouldRequestFrame = false;
  {
    std::lock_guard<std::mutex> lock(frameTimeoutsMutex_);
    if (!requestFrame_) {
      for (auto &job : jobs) {
        pushTask(std::move(job));
      }
      return;
    }
    for (auto &job : jobs) {
      frameTimeouts_.push_back(std::move(job));
    }
    shouldRequestFrame = !frameRequested_;
    frameRequested_ = true;
  }
  if (shouldRequestFrame) {
    pushTask([weakThis = weak_from_this()](jsi::Runtime &) {
      if (const auto strongThis = weakThis.lock()) {
        strongThis->requestFrame();
      }
    });
  }
}

void EventLoop::requestFrame() {
  FrameRequester requestFrame;
  {
    std::lock_guard<std::mutex> lock(frameTimeoutsMutex_);
    requestFrame = requestFrame_;
  }
  requestFrame([weakThis = weak_from_this()](double) {
    if (const auto strongThis = weakThis.lock()) {
      strongThis->runFrameTimeouts();
    }
  });
}

void EventLoop::runFrameTimeouts() {
  std::vector<std::function<void(jsi::Runtime & rt)>> timeouts;
  bool deliversOnRuntimeThread;
  {
    std::lock_guard<std::mutex> lock(frameTimeoutsMutex_);
    std::swap(timeouts, frameTimeouts_);
    frameRequested_ = false;
    deliversOnRuntimeThread = deliversOnRuntimeThread_;
  }
  for (auto &timeout : timeouts) {
    if (deliversOnRuntimeThread) {
      runTask(timeout);
    } else {
      pushTask(std::move(timeout));
    }
  }
}

void EventLoop::pushTimeout(std::function<void(jsi::Runtime &rt)> &&job, int64_t delay, bool frameAligned) {
  {
    std::unique_lock<std::mutex> lock(timeoutsQueueState_->mutex);
    if (!timeoutsQueueState_->running) {
      return;
    }
    const auto targetTime = getCurrentTimeInMs() + delay;
    const auto timeout = Timeout{std::move(job), targetTime, frameAligned};
    auto &queue = timeoutsQueueState_->queue;
    auto it = std::upper_bound(queue.begin(), queue.end(), timeout);
    queue.insert(it, timeout);
  }
  timeoutsQueueState_->cv.notify_one();
}

int64_t EventLoop::getCurrentTimeInMs() {
  const auto currentTime = std::chrono::system_clock::now().time_since_epoch();
  return std::chrono::duration_cast<std::chrono::milliseconds>(currentTime).count();
}

} // namespace worklets
