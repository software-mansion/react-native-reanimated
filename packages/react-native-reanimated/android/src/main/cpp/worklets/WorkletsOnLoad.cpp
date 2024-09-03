#include <fbjni/fbjni.h>

#include "AndroidUIScheduler.h"
#include "WorkletsModule.h"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM *vm, void *) {
  return facebook::jni::initialize(vm, [] {
    reanimated::WorkletsModule::registerNatives();
    reanimated::AndroidUIScheduler::registerNatives();
  });
}
