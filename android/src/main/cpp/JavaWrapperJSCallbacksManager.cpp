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
    makeNativeMethod("executeSharedAnimationProgressCallback", JavaWrapperJSCallbacksManager::executeSharedAnimationProgressCallback),
  });
}

void JavaWrapperJSCallbacksManager::setJSCallbackManager(
  std::shared_ptr<JSCallbacksManager> jsCallbacksManager
) {
  jsCallbacksManager_ = jsCallbacksManager;
}

jni::local_ref<JMap<JString, JObject>> JavaWrapperJSCallbacksManager::executeSharedAnimationProgressCallback(
  const int viewTag,
  const double progress,
  const jni::alias_ref<JMap<JString, JObject>> sharedAnimationWorkletData
) {
  jsi::Runtime &runtime = *jsCallbacksManager_->getRuntimeHelper()->uiRuntime();
  jsi::Value convertedValues = JNIHelper::convertJNIMapToJSIObject(
    runtime, sharedAnimationWorkletData);
  jsi::Value values = jsCallbacksManager_->executeSharedAnimationProgressCallback(
    viewTag, progress, convertedValues);
  return JNIHelper::convertJSIObjectToJNIMap(runtime, values.asObject(runtime));
}

} // namespace reanimated
