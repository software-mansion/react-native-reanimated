#include <fbjni/fbjni.h>

#include <worklets/android/AndroidUIScheduler.h>
#include <worklets/android/AnimationFrameCallback.h>
#include <worklets/android/JScriptBufferWrapper.h>
#include <worklets/android/JWorkletRuntimeWrapper.h>
#include <worklets/android/WorkletsModule.h>

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM *vm, void *) {
  return facebook::jni::initialize(vm, [vm] {
    worklets::WorkletsModule::registerNatives(vm);
    worklets::AndroidUIScheduler::registerNatives();
    worklets::AnimationFrameCallback::registerNatives();
    worklets::JScriptBufferWrapper::registerNatives();
    worklets::JWorkletRuntimeWrapper::registerNatives();
  });
}
