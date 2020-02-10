//
// Created by Szymon Kapala on 2020-02-07.
//

#include "Scheduler.h"
#define APPNAME "NATIVE_REANIMATED"
#include <android/log.h>


void Scheduler::scheduleOnUI(std::function<void()> job) {
  uiJobs.push(job);
}

void Scheduler::scheduleOnJS(std::function<void()> job) {
  __android_log_print(ANDROID_LOG_VERBOSE, APPNAME, "push OK");
  jsJobs.push(job);
}

void Scheduler::triggerUI() {
  auto job = uiJobs.pop();
  job();
}

void Scheduler::triggerJS() {
  __android_log_print(ANDROID_LOG_VERBOSE, APPNAME, "triggerJS OK");
  auto job = jsJobs.pop();
  job();
}

Scheduler::~Scheduler() {}

