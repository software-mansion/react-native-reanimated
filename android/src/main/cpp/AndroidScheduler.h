#pragma once

#include <fbjni/fbjni.h>
#include <jni.h>
#include <jsi/jsi.h>
#include <react/jni/CxxModuleWrapper.h>
#include <react/jni/JMessageQueueThread.h>

#include <memory>

#include "UIScheduler.h"

namespace reanimated {

using namespace facebook;

class AndroidScheduler : public jni::HybridClass<AndroidScheduler> {
 public:
  static auto constexpr kJavaDescriptor =
      "Lcom/swmansion/reanimated/Scheduler;";
  static jni::local_ref<jhybriddata> initHybrid(
      jni::alias_ref<jhybridobject> jThis);
  static void registerNatives();

  std::shared_ptr<UIScheduler> getScheduler() {
    return uiScheduler_;
  }

  void scheduleTriggerOnUI();

 private:
  friend HybridBase;

  void triggerUI();

  jni::global_ref<AndroidScheduler::javaobject> javaPart_;
  std::shared_ptr<UIScheduler> uiScheduler_;

  explicit AndroidScheduler(
      jni::alias_ref<AndroidScheduler::jhybridobject> jThis);
};

} // namespace reanimated
