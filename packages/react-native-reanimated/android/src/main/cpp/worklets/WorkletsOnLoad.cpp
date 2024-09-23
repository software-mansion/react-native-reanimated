#include <fbjni/fbjni.h>

#include "WorkletsModule.h"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM *vm, void *) {
  return facebook::jni::initialize(
      vm, [] { reanimated::WorkletsModule::registerNatives(); });
}
