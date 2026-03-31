#include <worklets/android/AndroidUIScheduler.h>

#include <utility>

namespace worklets {

using namespace facebook;
using namespace react;

class UISchedulerWrapper : public UIScheduler {
 private:
  jni::global_ref<AndroidUIScheduler::javaobject> androidUiScheduler_;

 public:
  explicit UISchedulerWrapper(jni::global_ref<AndroidUIScheduler::javaobject> androidUiScheduler)
      : androidUiScheduler_(std::move(androidUiScheduler)) {}

  void scheduleOnUI(std::function<void()> job) override {
    UIScheduler::scheduleOnUI(job);
    if (!scheduledOnUI_) {
      scheduledOnUI_ = true;
      androidUiScheduler_->cthis()->scheduleTriggerOnUI();
    }
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
