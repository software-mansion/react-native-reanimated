#include "JavaWrapperJSConfigManager.h"

namespace reanimated {

  JavaWrapperJSConfigManager::JavaWrapperJSConfigManager(
    jni::alias_ref<JavaWrapperJSConfigManager::javaobject> jThis)
    : javaPart_(jni::make_global(jThis)) {}

  jni::local_ref<JavaWrapperJSConfigManager::jhybriddata> JavaWrapperJSConfigManager::initHybrid(
    jni::alias_ref<jhybridobject> jThis) {
    return makeCxxInstance(jThis);
  }

  void JavaWrapperJSConfigManager::registerNatives() {
    registerHybrid({
      makeNativeMethod("initHybrid", JavaWrapperJSConfigManager::initHybrid),
      makeNativeMethod("getSharedTransitionConfig", JavaWrapperJSConfigManager::getSharedTransitionConfig),
    });
  }

  void JavaWrapperJSConfigManager::setJSConfigManager(
    std::shared_ptr<JSConfigManager> jsConfigManager
  ) {
    jsConfigManager_ = jsConfigManager;
  }

  int JavaWrapperJSConfigManager::getSharedTransitionConfig(const int viewTag) {
    int transitionType = static_cast<int>(jsConfigManager_->getSharedTansitionConfig(viewTag));
    return transitionType;
  }

} // namespace reanimated
