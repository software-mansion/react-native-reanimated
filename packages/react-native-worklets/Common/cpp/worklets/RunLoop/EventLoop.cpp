#include <worklets/RunLoop/EventLoop.h>

#include <thread>
#include <utility>
#include <vector>

namespace worklets {

EventLoop::EventLoop(
    const std::string &name,
    const std::weak_ptr<jsi::Runtime> runtime,
    const std::shared_ptr<AsyncQueue> &queue)
    : runtime_(runtime),
      queue_(queue),
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
  auto thread = std::thread(
      [threadName, state = timeoutsQueueState_, weakThis = weak_from_this()] {
#if __APPLE__
        pthread_setname_np(threadName.c_str());
#endif
        while (state->running) {
          std::unique_lock<std::mutex> lock(state->mutex);
          auto currentTime = getCurrentTimeInMs();
          std::vector<std::function<void(jsi::Runtime & rt)>> jobs;
          auto &timeouts = state->queue;
          timeouts.erase(
              std::remove_if(
                  timeouts.begin(),
                  timeouts.end(),
                  [currentTime, &jobs](const Timeout &timeout) {
                    if (currentTime >= timeout.targetTime) {
                      jobs.emplace_back(timeout.callback);
                      return true;
                    }
                    return false;
                  }),
              timeouts.end());
          lock.unlock();

          if (auto stronThis = weakThis.lock()) {
            for (auto &job : jobs) {
              stronThis->pushTask(std::move(job));
            }
          }

          lock.lock();
          if (state->queue.empty()) {
            state->cv.wait(lock);
          } else {
            const auto nextTimeout = std::min_element(
                state->queue.begin(),
                state->queue.end(),
                [](const auto &v1, const auto &v2) {
                  return v1.targetTime < v2.targetTime;
                });
            const auto timeToWait =
                nextTimeout->targetTime - getCurrentTimeInMs();
            state->cv.wait_for(lock, std::chrono::milliseconds(timeToWait));
          }
          lock.unlock();
        }
      });
#ifdef ANDROID
  pthread_setname_np(thread.native_handle(), threadName.c_str());
#endif
  thread.detach();
}

void EventLoop::pushTask(std::function<void(jsi::Runtime &rt)> &&job) {
  queue_->push([weakThis = weak_from_this(), job = std::move(job)] {
    const auto self = weakThis.lock();
    if (!self) {
      return;
    }
    if (auto runtime = self->runtime_.lock()) {
      job(*runtime);
    }
  });
}

void EventLoop::pushTimeout(
    std::function<void(jsi::Runtime &rt)> &&job,
    int64_t delay) {
  {
    std::unique_lock<std::mutex> lock(timeoutsQueueState_->mutex);
    const auto targetTime = getCurrentTimeInMs() + delay;
    timeoutsQueueState_->queue.emplace_back(
        Timeout{std::move(job), targetTime});
  }
  timeoutsQueueState_->cv.notify_one();
}

int64_t EventLoop::getCurrentTimeInMs() {
  const auto currentTime = std::chrono::system_clock::now().time_since_epoch();
  return std::chrono::duration_cast<std::chrono::milliseconds>(currentTime)
      .count();
}

} // namespace worklets
