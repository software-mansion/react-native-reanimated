#include <fbjni/fbjni.h>

#include "AndroidUIScheduler.h"
#include "WorkletsNativeProxy.h"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM *vm, void *) {
  return facebook::jni::initialize(vm, [] {
    reanimated::WorkletsNativeProxy::registerNatives();
    reanimated::AndroidUIScheduler::registerNatives();
  });
}
