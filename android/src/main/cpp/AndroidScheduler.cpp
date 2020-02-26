//
// Created by Szymon Kapala on 2020-02-07.
//

#include "AndroidScheduler.h"
#include <jni.h>
#define APPNAME "NATIVE_REANIMATED"
#include <android/log.h>

AndroidScheduler::AndroidScheduler(JavaVM *vm) {
  this->vm = vm;
}

AndroidScheduler::~AndroidScheduler() {}

void AndroidScheduler::scheduleOnUI(std::function<void()> job) { // memorize jclass and method id !!!!
  Scheduler::scheduleOnUI(job);
  // call java function
  JNIEnv *env;
  vm->AttachCurrentThread(&env, NULL);

  jclass schedulerClass = env->FindClass("com/swmansion/reanimated/Scheduler");
  jmethodID scheduleMethod = env->GetStaticMethodID(schedulerClass, "scheduleTriggerOnUI", "()Z");
  if (!(env->CallStaticBooleanMethod(schedulerClass, scheduleMethod))) {
    uiJobs.pop();
  }
}

void AndroidScheduler::scheduleOnJS(std::function<void()> job) { // memorize jclass and method id !!!!
  Scheduler::scheduleOnJS(job);
  // call java function
  JNIEnv *env;
  vm->AttachCurrentThread(&env, NULL);

  jclass schedulerClass = env->FindClass("com/swmansion/reanimated/Scheduler");
  jmethodID scheduleMethod = env->GetStaticMethodID(schedulerClass, "scheduleTriggerOnJS", "()Z");
  if (!(env->CallStaticBooleanMethod(schedulerClass, scheduleMethod))) {
    jsJobs.pop();
  }
}