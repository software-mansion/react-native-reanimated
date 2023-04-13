#pragma once

#include <fbjni/fbjni.h>
#include <jsi/jsi.h>
#include <memory>
#include <string>
#include "JNIHelper.h"
#include "JSConfigManager.h"

namespace reanimated {

using namespace facebook::jni;
using namespace facebook;

class JavaWrapperJSConfigManager
    : public jni::HybridClass<JavaWrapperJSConfigManager> {
 public:
  static auto constexpr kJavaDescriptor =
      "Lcom/swmansion/reanimated/JavaWrapperJSConfigManager;";
  static jni::local_ref<jhybriddata> initHybrid(
      jni::alias_ref<jhybridobject> jThis);
  static void registerNatives();
  void setJSConfigManager(std::shared_ptr<JSConfigManager> jsConfigManager);
  int getSharedTransitionConfig(const int viewTag);

 private:
  friend HybridBase;
  jni::global_ref<JavaWrapperJSConfigManager::javaobject> javaPart_;
  std::shared_ptr<JSConfigManager> jsConfigManager_;

  explicit JavaWrapperJSConfigManager(
      jni::alias_ref<JavaWrapperJSConfigManager::jhybridobject> jThis);
};

} // namespace reanimated
