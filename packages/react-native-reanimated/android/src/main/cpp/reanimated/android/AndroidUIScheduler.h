#pragma once

#include <fbjni/detail/Hybrid.h>
#include <fbjni/detail/References-forward.h>
#include <worklets/Tools/UIScheduler.h>

#include <fbjni/fbjni.h>
#include <jni.h>
#include <jsi/jsi.h>
#include <react/jni/CxxModuleWrapper.h>
#include <react/jni/JMessageQueueThread.h>

#include <memory>

namespace reanimated {

class AndroidUIScheduler
    : public facebook::jni::HybridClass<AndroidUIScheduler> {
 public:
  static auto constexpr kJavaDescriptor =
      "Lcom/swmansion/reanimated/AndroidUIScheduler;";
  static facebook::jni::local_ref<jhybriddata> initHybrid(
      facebook::jni::alias_ref<jhybridobject> jThis);
  static void registerNatives();

  std::shared_ptr<worklets::UIScheduler> getUIScheduler() {
    return uiScheduler_;
  }

  void scheduleTriggerOnUI();

 private:
  friend HybridBase;

  void triggerUI();

  facebook::jni::global_ref<AndroidUIScheduler::javaobject> javaPart_;
  std::shared_ptr<worklets::UIScheduler> uiScheduler_;

  explicit AndroidUIScheduler(
      facebook::jni::alias_ref<AndroidUIScheduler::jhybridobject> jThis);
};

} // namespace reanimated
