#include <fbjni/fbjni.h>

#include <reanimated/android/AnimationFrameCallback.h>
#include <reanimated/android/EventHandler.h>
#include <reanimated/android/KeyboardWorkletWrapper.h>
#include <reanimated/android/NativeProxy.h>
#include <reanimated/android/SensorSetter.h>

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM *vm, void *) {
  return facebook::jni::initialize(vm, [] {
    reanimated::NativeProxy::registerNatives();
    reanimated::AnimationFrameCallback::registerNatives();
    reanimated::EventHandler::registerNatives();
    reanimated::SensorSetter::registerNatives();
    reanimated::KeyboardWorkletWrapper::registerNatives();
  });
}
