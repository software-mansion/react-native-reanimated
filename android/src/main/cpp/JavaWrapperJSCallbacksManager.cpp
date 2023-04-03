#include "JavaWrapperJSCallbacksManager.h"

namespace reanimated {

JavaWrapperJSCallbacksManager::JavaWrapperJSCallbacksManager(
  jni::alias_ref<JavaWrapperJSCallbacksManager::javaobject> jThis)
  : javaPart_(jni::make_global(jThis)) {}

jni::local_ref<JavaWrapperJSCallbacksManager::jhybriddata> JavaWrapperJSCallbacksManager::initHybrid(
  jni::alias_ref<jhybridobject> jThis) {
    return makeCxxInstance(jThis);
}

void JavaWrapperJSCallbacksManager::registerNatives() {
  registerHybrid({
    makeNativeMethod("initHybrid", JavaWrapperJSCallbacksManager::initHybrid),
  });
}

void JavaWrapperJSCallbacksManager::setJSCallbackManager(
  std::shared_ptr<JSCallbacksManager> jsCallbacksManager
) {
  jsCallbacksManager_ = jsCallbacksManager;
}

} // namespace reanimated
