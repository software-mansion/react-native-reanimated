#include <fbjni/fbjni.h>

#include <worklets/android/AndroidUIScheduler.h>
#include <worklets/android/AnimationFrameCallback.h>
#include <worklets/android/JScriptBufferWrapper.h>
#include <worklets/android/JWorkletRuntimeWrapper.h>
#include <worklets/android/WorkletsModule.h>

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM *vm, void *) {
  return facebook::jni::initialize(vm, [] {
    worklets::WorkletsModule::registerNatives();
    worklets::AndroidUIScheduler::registerNatives();
    worklets::AnimationFrameCallback::registerNatives();
    worklets::JScriptBufferWrapper::registerNatives();
#if defined(WORKLETS_BUNDLE_MODE_ENABLED) && defined(WORKLETS_FETCH_PREVIEW_ENABLED)
    worklets::JWorkletRuntimeWrapper::registerNatives();
#endif // defined(WORKLETS_BUNDLE_MODE_ENABLED) && defined(WORKLETS_FETCH_PREVIEW_ENABLED)
  });
}
