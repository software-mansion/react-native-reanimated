#include <fbjni/detail/References-forward.h>
#include <fbjni/detail/References.h>
#include <reanimated/android/AndroidUIScheduler.h>

#include <android/log.h>
#include <fbjni/fbjni.h>
#include <jsi/jsi.h>

namespace reanimated {

class UISchedulerWrapper : public worklets::UIScheduler {
 private:
  facebook::jni::global_ref<AndroidUIScheduler::javaobject> androidUiScheduler_;

 public:
  explicit UISchedulerWrapper(
      facebook::jni::global_ref<AndroidUIScheduler::javaobject>
          androidUiScheduler)
      : androidUiScheduler_(androidUiScheduler) {}

  void scheduleOnUI(std::function<void()> job) override {
    UIScheduler::scheduleOnUI(job);
    if (!scheduledOnUI_) {
      scheduledOnUI_ = true;
      androidUiScheduler_->cthis()->scheduleTriggerOnUI();
    }
  }

  ~UISchedulerWrapper() {}
};

AndroidUIScheduler::AndroidUIScheduler(
    facebook::jni::alias_ref<AndroidUIScheduler::javaobject> jThis)
    : javaPart_(make_global(jThis)),
      uiScheduler_(std::make_shared<UISchedulerWrapper>(make_global(jThis))) {}

facebook::jni::local_ref<AndroidUIScheduler::jhybriddata>
AndroidUIScheduler::initHybrid(facebook::jni::alias_ref<jhybridobject> jThis) {
  return makeCxxInstance(jThis);
}

void AndroidUIScheduler::triggerUI() {
  uiScheduler_->triggerUI();
}

void AndroidUIScheduler::scheduleTriggerOnUI() {
  static const auto method =
      javaPart_->getClass()->getMethod<void()>("scheduleTriggerOnUI");
  method(javaPart_.get());
}

void AndroidUIScheduler::registerNatives() {
  registerHybrid({
      makeNativeMethod("initHybrid", AndroidUIScheduler::initHybrid),
      makeNativeMethod("triggerUI", AndroidUIScheduler::triggerUI),
  });
}

} // namespace reanimated
