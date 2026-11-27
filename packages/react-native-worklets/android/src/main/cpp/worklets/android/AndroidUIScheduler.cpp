#include <worklets/android/AndroidUIScheduler.h>

#include <utility>

namespace worklets {

using namespace facebook;
using namespace react;

class UISchedulerWrapper : public UIScheduler {
 private:
  jni::global_ref<AndroidUIScheduler::javaobject> androidUiScheduler_;

  void requestTrigger() {
    if (!scheduledOnUI_.exchange(true)) {
      static const auto method = androidUiScheduler_->getClass()->getMethod<void()>("scheduleTriggerOnUI");
      method(androidUiScheduler_);
    }
  }

  bool queryIsOnUIThread() const override {
    static const auto method = androidUiScheduler_->getClass()->getMethod<jboolean()>("isOnUIThread");
    return method(androidUiScheduler_);
  }

 public:
  explicit UISchedulerWrapper(jni::global_ref<AndroidUIScheduler::javaobject> androidUiScheduler)
      : androidUiScheduler_(std::move(androidUiScheduler)) {}

  void onUIThreadTrigger() {
    triggerUI();
  }

  void scheduleOnUI(std::function<void()> job) override {
    if (canInvokeSync()) {
      invokeSync(job, [this] { requestTrigger(); });
      return;
    }

    UIScheduler::scheduleOnUI(std::move(job));
    if (isOnUIThread() && drainingUI_) {
      return;
    }
    requestTrigger();
  }
};

AndroidUIScheduler::AndroidUIScheduler(const jni::alias_ref<AndroidUIScheduler::jhybridobject> &jThis)
    : uiScheduler_(std::make_shared<UISchedulerWrapper>(jni::make_global(jThis))) {}

jni::local_ref<AndroidUIScheduler::jhybriddata> AndroidUIScheduler::initHybrid(
    jni::alias_ref<jhybridobject> jThis) { // NOLINT //(performance-unnecessary-value-param)
  return makeCxxInstance(jThis);
}

std::shared_ptr<UIScheduler> AndroidUIScheduler::getUIScheduler() {
  return uiScheduler_;
}

void AndroidUIScheduler::triggerUI() {
  if (!uiScheduler_) {
    return;
  }
  uiScheduler_->onUIThreadTrigger();
}

void AndroidUIScheduler::invalidate() {
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
