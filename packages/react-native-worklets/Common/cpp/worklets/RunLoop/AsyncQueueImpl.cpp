#include <worklets/RunLoop/AsyncQueueImpl.h>

#if defined(ANDROID) && defined(WORKLETS_BUNDLE_MODE_ENABLED) && defined(WORKLETS_FETCH_PREVIEW_ENABLED)
#include <fbjni/detail/Environment.h>
#include <jni.h>
#endif // defined(ANDROID) && defined(WORKLETS_BUNDLE_MODE_ENABLED) && defined(WORKLETS_FETCH_PREVIEW_ENABLED)

#include <memory>
#include <string>
#include <thread>
#include <utility>

namespace worklets {

using namespace facebook;

void AsyncQueueImpl::runLoop(const std::shared_ptr<AsyncQueueState> &state) {
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
}

AsyncQueueImpl::AsyncQueueImpl(const std::string &name) : state_(std::make_shared<AsyncQueueState>()) {
#if defined(ANDROID) && defined(WORKLETS_BUNDLE_MODE_ENABLED) && defined(WORKLETS_FETCH_PREVIEW_ENABLED)
  auto *env = jni::Environment::current();
  JavaVM *jvm = nullptr;
  env->GetJavaVM(&jvm);
  auto thread = std::thread([name, state = state_, jvm] {
    jvm->AttachCurrentThread(nullptr, nullptr);
    jni::ThreadScope::WithClassLoader([state]() { AsyncQueueImpl::runLoop(state); });
    jvm->DetachCurrentThread();
  });
  pthread_setname_np(thread.native_handle(), name.c_str());
  thread.detach();
#elif defined(ANDROID)
  auto thread = std::thread([name, state = state_] { AsyncQueueImpl::runLoop(state); });
  pthread_setname_np(thread.native_handle(), name.c_str());
  thread.detach();
#else
  auto thread = std::thread([name, state = state_] {
    pthread_setname_np(name.c_str());
    AsyncQueueImpl::runLoop(state);
  });
  thread.detach();
#endif // defined(ANDROID) && defined(WORKLETS_BUNDLE_MODE_ENABLED) && defined(WORKLETS_FETCH_PREVIEW_ENABLED)
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
