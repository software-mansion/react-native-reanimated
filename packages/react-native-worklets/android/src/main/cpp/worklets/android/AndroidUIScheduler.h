#pragma once

#include <worklets/Tools/UIScheduler.h>

#include <fbjni/fbjni.h>
#include <jsi/jsi.h>

#include <memory>

namespace worklets {

using namespace facebook;
using namespace worklets;

class AndroidUIScheduler : public jni::HybridClass<AndroidUIScheduler> {
 public:
  static auto constexpr kJavaDescriptor = "Lcom/swmansion/worklets/AndroidUIScheduler;";
  static jni::local_ref<jhybriddata> initHybrid(jni::alias_ref<jhybridobject> jThis);
  static void registerNatives();

  std::shared_ptr<UIScheduler> getUIScheduler() {
    return uiScheduler_;
  }

  void scheduleTriggerOnUI();

 private:
  friend HybridBase;

  void triggerUI();

  void invalidate();

  jni::global_ref<AndroidUIScheduler::javaobject> javaPart_;
  std::shared_ptr<UIScheduler> uiScheduler_;

  explicit AndroidUIScheduler(jni::alias_ref<AndroidUIScheduler::jhybridobject> jThis);
};

} // namespace worklets
