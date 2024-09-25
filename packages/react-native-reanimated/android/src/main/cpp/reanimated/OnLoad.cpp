#include <fbjni/fbjni.h>

#include <reanimated/AndroidUIScheduler.h>
#include <reanimated/LayoutAnimations.h>
#include <reanimated/NativeProxy.h>

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM *vm, void *) {
  return facebook::jni::initialize(vm, [] {
    reanimated::NativeProxy::registerNatives();
    reanimated::AnimationFrameCallback::registerNatives();
    reanimated::EventHandler::registerNatives();
    reanimated::AndroidUIScheduler::registerNatives();
    reanimated::LayoutAnimations::registerNatives();
    reanimated::SensorSetter::registerNatives();
    reanimated::KeyboardWorkletWrapper::registerNatives();
  });
}
