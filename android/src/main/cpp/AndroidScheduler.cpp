//
// Created by Szymon Kapala on 2020-02-07.
//

#include "AndroidScheduler.h"
#include <jni.h>
#define APPNAME "NATIVE_REANIMATED"
#include <android/log.h>

AndroidScheduler::AndroidScheduler(JavaVM *vm, std::shared_ptr<JNIRegistry> jniRegistry) {
  this->vm = vm;
  this->jniRegistry = jniRegistry;
}

AndroidScheduler::~AndroidScheduler() {}

void AndroidScheduler::scheduleOnUI(std::function<void()> job) { // memorize jclass and method id !!!!
  Scheduler::scheduleOnUI(job);
  // call java function
  JNIEnv *env;
  vm->AttachCurrentThread(&env, NULL);

  auto scheduleMethod = jniRegistry->getClassAndMethod(JavaMethodsUsed::TriggerOnUI, JNIMethodMode::static_method, env, vm);
  if (!(env->CallStaticBooleanMethod(std::get<0>(scheduleMethod), std::get<1>(scheduleMethod)))) {
    uiJobs.pop();
  }
}

void AndroidScheduler::scheduleOnJS(std::function<void()> job) { // memorize jclass and method id !!!!
  Scheduler::scheduleOnJS(job);
  // call java function
  JNIEnv *env;
  vm->AttachCurrentThread(&env, NULL);

  auto scheduleMethod = jniRegistry->getClassAndMethod(JavaMethodsUsed::TriggerOnJS, JNIMethodMode::static_method, env, vm);
  if (!(env->CallStaticBooleanMethod(std::get<0>(scheduleMethod), std::get<1>(scheduleMethod)))) {
    jsJobs.pop();
  }
}