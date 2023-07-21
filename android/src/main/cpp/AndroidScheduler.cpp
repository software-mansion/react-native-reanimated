#include "AndroidScheduler.h"
#include <android/log.h>
#include <fbjni/fbjni.h>
#include <jsi/jsi.h>
#include <memory>
#include <string>

namespace reanimated {

using namespace facebook;
using namespace react;

class SchedulerWrapper : public Scheduler {
 private:
  jni::global_ref<AndroidScheduler::javaobject> scheduler_;

 public:
  explicit SchedulerWrapper(
      jni::global_ref<AndroidScheduler::javaobject> scheduler)
      : scheduler_(scheduler) {}

  void scheduleOnUI(std::function<void()> job) override {
    Scheduler::scheduleOnUI(job);
    if (!scheduledOnUI_) {
      scheduledOnUI_ = true;
      scheduler_->cthis()->scheduleTriggerOnUI();
    }
  }

  ~SchedulerWrapper() {}
};

AndroidScheduler::AndroidScheduler(
    jni::alias_ref<AndroidScheduler::javaobject> jThis)
    : javaPart_(jni::make_global(jThis)),
      scheduler_(new SchedulerWrapper(jni::make_global(jThis))) {}

jni::local_ref<AndroidScheduler::jhybriddata> AndroidScheduler::initHybrid(
    jni::alias_ref<jhybridobject> jThis) {
  return makeCxxInstance(jThis);
}

void AndroidScheduler::triggerUI() {
  scheduler_->triggerUI();
}

void AndroidScheduler::scheduleTriggerOnUI() {
  static const auto method =
      javaPart_->getClass()->getMethod<void()>("scheduleTriggerOnUI");
  method(javaPart_.get());
}

void AndroidScheduler::registerNatives() {
  registerHybrid({
      makeNativeMethod("initHybrid", AndroidScheduler::initHybrid),
      makeNativeMethod("triggerUI", AndroidScheduler::triggerUI),
  });
}

} // namespace reanimated
