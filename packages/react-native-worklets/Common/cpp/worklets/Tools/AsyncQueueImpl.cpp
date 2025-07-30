#include <worklets/Tools/AsyncQueueImpl.h>

#include <thread>
#include <utility>

namespace worklets {

AsyncQueueImpl::AsyncQueueImpl(std::string name)
    : state_(std::make_shared<AsyncQueueState>()),
      timeoutsQueueState_(std::make_shared<TimeoutsQueueState>()) {
  startMainRunLoopThread(name);
  startTimeoutRunLoopThread(name);
}

AsyncQueueImpl::~AsyncQueueImpl() {
  {
    std::unique_lock<std::mutex> lock(state_->mutex);
    state_->running = false;
    state_->queue = {};
    timeoutsQueueState_->running = false;
    timeoutsQueueState_->queue = {};
  }
  state_->cv.notify_all();
  timeoutsQueueState_->cv.notify_all();
}

void AsyncQueueImpl::push(std::function<void()> &&job) {
  {
    std::unique_lock<std::mutex> lock(state_->mutex);
    state_->queue.emplace(job);
  }
  state_->cv.notify_one();
}

void AsyncQueueImpl::pushPriority(std::function<void()> &&job) {
  {
    std::unique_lock<std::mutex> lock(state_->mutex);
    state_->priorityQueue.emplace(job);
  }
  state_->cv.notify_one();
}

void AsyncQueueImpl::pushTimeout(std::function<void()> &&job, long long delay) {
  {
    std::unique_lock<std::mutex> lock(timeoutsQueueState_->mutex);
    const auto targetTime = getCurrentTimeInMs() + delay;
    timeoutsQueueState_->queue.emplace_back(Timeout{job, targetTime});
  }
  timeoutsQueueState_->cv.notify_one();
}

long long AsyncQueueImpl::getCurrentTimeInMs() {
  const auto currentTime = std::chrono::system_clock::now().time_since_epoch();
  return std::chrono::duration_cast<std::chrono::milliseconds>(currentTime)
      .count();
}

void AsyncQueueImpl::startMainRunLoopThread(const std::string &name) {
  auto thread = std::thread([name, state = state_] {
#if __APPLE__
    pthread_setname_np(name.c_str());
#endif
    while (state->running) {
      std::unique_lock<std::mutex> lock(state->mutex);
      state->cv.wait(lock, [state] {
        return !state->queue.empty() || !state->priorityQueue.empty() ||
            !state->running;
      });
      if (!state->running) {
        return;
      }
      if (state->queue.empty() && state->priorityQueue.empty()) {
        continue;
      }
      std::function<void()> job;
      if (!state->priorityQueue.empty()) {
        job = std::move(state->priorityQueue.front());
        state->priorityQueue.pop();
      } else {
        job = std::move(state->queue.front());
        state->queue.pop();
      }
      lock.unlock();
      job();
    }
  });
#ifdef ANDROID
  pthread_setname_np(thread.native_handle(), name.c_str());
#endif
  thread.detach();
}

void AsyncQueueImpl::startTimeoutRunLoopThread(const std::string &name) {
  const auto threadName = name + "(timeout)";
  auto thread = std::thread([threadName, state = timeoutsQueueState_, this] {
#if __APPLE__
    pthread_setname_np(threadName.c_str());
#endif
    while (state->running) {
      std::unique_lock<std::mutex> lock(state->mutex);
      auto currentTime = getCurrentTimeInMs();
      std::vector<std::function<void()>> jobs;
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

      for (auto &job : jobs) {
        this->push(std::move(job));
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
        const auto timeToWait = nextTimeout->targetTime - getCurrentTimeInMs();
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

} // namespace worklets
