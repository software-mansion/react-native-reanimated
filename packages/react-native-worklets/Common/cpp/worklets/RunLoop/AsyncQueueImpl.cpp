#include <worklets/RunLoop/AsyncQueueImpl.h>

#include <memory>
#include <string>
#include <thread>
#include <utility>

namespace worklets {

AsyncQueueImpl::AsyncQueueImpl(const std::string &name) : state_(std::make_shared<AsyncQueueState>()) {
  auto thread = std::thread([name, state = state_] {
#if __APPLE__
    pthread_setname_np(name.c_str());
#endif
    while (state->running) {
      std::unique_lock<std::mutex> lock(state->mutex);
      state->cv.wait(lock, [state] { return !state->queue.empty() || !state->running; });
      if (!state->running) {
        return;
      }
      if (state->queue.empty()) {
        continue;
      }
      auto job = std::move(state->queue.front());
      state->queue.pop();
      lock.unlock();
      job();
    }
  });
#ifdef ANDROID
  pthread_setname_np(thread.native_handle(), name.c_str());
#endif
  thread.detach();
}

AsyncQueueImpl::~AsyncQueueImpl() {
  {
    std::unique_lock<std::mutex> lock(state_->mutex);
    state_->running = false;
    state_->queue = {};
  }
  state_->cv.notify_all();
}

void AsyncQueueImpl::push(std::function<void()> &&job) {
  {
    std::unique_lock<std::mutex> lock(state_->mutex);
    state_->queue.emplace(job);
  }
  state_->cv.notify_one();
}

AsyncQueueUI::AsyncQueueUI(const std::shared_ptr<UIScheduler> &uiScheduler) : uiScheduler_(uiScheduler) {}

void AsyncQueueUI::push(std::function<void()> &&job) {
  uiScheduler_->scheduleOnUI(std::move(job));
}

} // namespace worklets
