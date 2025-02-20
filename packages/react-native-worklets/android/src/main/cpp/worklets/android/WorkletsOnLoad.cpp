#include <fbjni/fbjni.h>

#include <worklets/android/AndroidUIScheduler.h>
#include <worklets/android/AnimationFrameCallback.h>
#include <worklets/android/WorkletsModule.h>

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM *vm, void *) {
  return facebook::jni::initialize(vm, [] {
    worklets::WorkletsModule::registerNatives();
    worklets::AndroidUIScheduler::registerNatives();
    worklets::AnimationFrameCallback::registerNatives();
  });
}
