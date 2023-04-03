#pragma once

#include <fbjni/fbjni.h>
#include <jsi/jsi.h>
#include <memory>
#include <string>
#include "JNIHelper.h"
#include "JSCallbacksManager.h"

namespace reanimated {

using namespace facebook::jni;
using namespace facebook;

class JavaWrapperJSCallbacksManager : public jni::HybridClass<JavaWrapperJSCallbacksManager> {
public:
  static auto constexpr kJavaDescriptor =
  "Lcom/swmansion/reanimated/JavaWrapperJSCallbacksManager;";
  static jni::local_ref<jhybriddata> initHybrid(
    jni::alias_ref<jhybridobject> jThis);
  static void registerNatives();
  void setJSCallbackManager(std::shared_ptr<JSCallbacksManager> jsCallbacksManager);
private:
  friend HybridBase;
  jni::global_ref<JavaWrapperJSCallbacksManager::javaobject> javaPart_;
  std::shared_ptr<JSCallbacksManager> jsCallbacksManager_;

explicit JavaWrapperJSCallbacksManager(
  jni::alias_ref<JavaWrapperJSCallbacksManager::jhybridobject> jThis);
};

} // namespace reanimated
