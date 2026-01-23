#include <fbjni/fbjni.h>

#include <react/jni/ReadableNativeArray.h>
#include <react/jni/ReadableNativeMap.h>
#include <worklets/android/AndroidUIScheduler.h>
#include <worklets/android/AnimationFrameCallback.h>
#include <worklets/android/JScriptBufferWrapper.h>
#include <worklets/android/JWorkletRuntimeWrapper.h>
#include <worklets/android/WorkletsModule.h>

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM *vm, void *) {
  ReadableNativeArray::registerNatives();
  ReadableNativeMap::registerNatives();
  return facebook::jni::initialize(vm, [vm] {
    // JNIEnv *env;
    // // if ((vm)->GetEnv(vm, (void **)&env) != JNI_OK) {
    // //   return JNI_ERR;
    // // }
    // vm->GetEnv(reinterpret_cast<void **>(&env), JNI_VERSION_1_6);
    // env->FindClass("com/swmansion/worklets/WorkletRuntimeWrapper");

    worklets::WorkletsModule::registerNatives(vm);
    worklets::AndroidUIScheduler::registerNatives();
    worklets::AnimationFrameCallback::registerNatives();
    worklets::JScriptBufferWrapper::registerNatives();
#if defined(WORKLETS_BUNDLE_MODE_ENABLED) && defined(WORKLETS_FETCH_PREVIEW_ENABLED)
    worklets::JWorkletRuntimeWrapper::registerNatives();
#endif // defined(WORKLETS_BUNDLE_MODE_ENABLED) && defined(WORKLETS_FETCH_PREVIEW_ENABLED)
  });
}
