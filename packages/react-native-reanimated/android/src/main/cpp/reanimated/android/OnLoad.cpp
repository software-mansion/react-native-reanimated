#include <fbjni/fbjni.h>

#include <reanimated/android/AnimationFrameCallback.h>
#include <reanimated/android/NativeProxy.h>

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM *vm, void *) {
  return facebook::jni::initialize(vm, [] {
    reanimated::NativeProxy::registerNatives();
    reanimated::AnimationFrameCallback::registerNatives();
    reanimated::EventHandler::registerNatives();
    reanimated::SensorSetter::registerNatives();
    reanimated::KeyboardWorkletWrapper::registerNatives();
  });
}
