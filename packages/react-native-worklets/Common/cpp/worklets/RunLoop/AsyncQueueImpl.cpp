#include <worklets/RunLoop/AsyncQueueImpl.h>

#ifdef ANDROID
#include <fbjni/fbjni.h>
#endif // ANDROID

#include <memory>
#include <string>
#include <thread>
#include <utility>

#if __APPLE__
extern "C" {
void *objc_autoreleasePoolPush(void);
void objc_autoreleasePoolPop(void *pool);
}
#endif // __APPLE__

namespace worklets {

using namespace facebook;

#if __APPLE__
namespace {

class ScopedAutoreleasePool {
 public:
  ScopedAutoreleasePool() : pool_(objc_autoreleasePoolPush()) {}
  ~ScopedAutoreleasePool() {
    objc_autoreleasePoolPop(pool_);
  }
  ScopedAutoreleasePool(const ScopedAutoreleasePool &) = delete;
  ScopedAutoreleasePool &operator=(const ScopedAutoreleasePool &) = delete;

 private:
  void *const pool_;
};

} // namespace
#endif // __APPLE__

void AsyncQueueImpl::runLoop(const std::shared_ptr<AsyncQueueState> &state) {
#if __APPLE__
  const ScopedAutoreleasePool threadAutoreleasePool;
#endif // __APPLE__
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
#if __APPLE__
    const ScopedAutoreleasePool autoreleasePool;
#endif // __APPLE__
    job();
  }
}

AsyncQueueImpl::AsyncQueueImpl(const std::string &name) : state_(std::make_shared<AsyncQueueState>()) {
  auto thread = std::thread([name, state = state_] {
#ifdef ANDROID
    pthread_setname_np(pthread_self(), name.c_str());
    jni::ThreadScope::WithClassLoader([state]() { AsyncQueueImpl::runLoop(state); });
#else
    pthread_setname_np(name.c_str());
    AsyncQueueImpl::runLoop(state);
#endif // ANDROID
  });
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
