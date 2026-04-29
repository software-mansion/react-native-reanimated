#include <worklets/android/AndroidUIScheduler.h>

#include <pthread.h>
#include <atomic>
#include <utility>

namespace worklets {

using namespace facebook;
using namespace react;

class UISchedulerWrapper : public UIScheduler {
 private:
  jni::global_ref<AndroidUIScheduler::javaobject> androidUiScheduler_;
  std::atomic<pthread_t> uiThreadId_{0};

  bool isOnUIThread() const {
    const auto cached = uiThreadId_.load(std::memory_order_acquire);
    return cached != 0 && pthread_equal(pthread_self(), cached);
  }

 public:
  explicit UISchedulerWrapper(jni::global_ref<AndroidUIScheduler::javaobject> androidUiScheduler)
      : androidUiScheduler_(std::move(androidUiScheduler)) {}

  void scheduleOnUI(std::function<void()> job) override {
    if (isOnUIThread()) {
      job();
      return;
    }
    UIScheduler::scheduleOnUI(job);
    if (!scheduledOnUI_) {
      scheduledOnUI_ = true;
      androidUiScheduler_->cthis()->scheduleTriggerOnUI();
    }
  }

  void triggerUI() override {
    uiThreadId_.store(pthread_self(), std::memory_order_release);
    UIScheduler::triggerUI();
  }
};

AndroidUIScheduler::AndroidUIScheduler(const jni::alias_ref<AndroidUIScheduler::jhybridobject> &jThis)
    : javaPart_(jni::make_global(jThis)), uiScheduler_(std::make_shared<UISchedulerWrapper>(jni::make_global(jThis))) {}

jni::local_ref<AndroidUIScheduler::jhybriddata> AndroidUIScheduler::initHybrid(
    jni::alias_ref<jhybridobject> jThis) { // NOLINT //(performance-unnecessary-value-param)
  return makeCxxInstance(jThis);
}

void AndroidUIScheduler::triggerUI() {
  if (!uiScheduler_) {
    return;
  }
  uiScheduler_->triggerUI();
}

void AndroidUIScheduler::scheduleTriggerOnUI() {
  static const auto method = javaPart_->getClass()->getMethod<void()>("scheduleTriggerOnUI");
  method(javaPart_.get());
}

void AndroidUIScheduler::invalidate() {
  javaPart_ = nullptr;
  uiScheduler_.reset();
}

void AndroidUIScheduler::registerNatives() {
  registerHybrid({
      makeNativeMethod("initHybrid", AndroidUIScheduler::initHybrid),
      makeNativeMethod("triggerUI", AndroidUIScheduler::triggerUI),
      makeNativeMethod("invalidate", AndroidUIScheduler::invalidate),
  });
}

} // namespace worklets
