//
// Created by Szymon Kapala on 2020-02-07.
//

#include "AndroidUIScheduler.h"
#include <jni.h>

AndroidUIScheduler::AndroidUIScheduler(JavaVM *vm) {
  this->vm = vm;
}

void AndroidUIScheduler::schedule(std::function<void()> job) {
  UIScheduler::schedule(job);
  // call java function
  JNIEnv *env;
  vm->AttachCurrentThread(&env, NULL);

  jclass nativeProxyClass = env->FindClass("com/swmansion/reanimated/NativeProxy");
  jmethodID scheduleTriggerMethod = env->GetStaticMethodID(nativeProxyClass, "scheduleTrigger", "(Z)I;");
  env->CallStaticObjectMethod(nativeProxyClass, scheduleTriggerMethod, (jboolean)true);
}
