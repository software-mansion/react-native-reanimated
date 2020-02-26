//
// Created by Szymon Kapala on 2020-02-07.
//

#include "Scheduler.h"

void Scheduler::scheduleOnUI(std::function<void()> job) {
  __android_log_print(ANDROID_LOG_VERBOSE, APPNAME, "schedule on UI %d", int(uiJobs.getSize()));
  uiJobs.push(job);
}

void Scheduler::scheduleOnJS(std::function<void()> job) {
  jsJobs.push(job);
}

void Scheduler::triggerUI() {
  __android_log_print(ANDROID_LOG_VERBOSE, APPNAME, "trigger on UI %d", int(uiJobs.getSize()));
  auto job = uiJobs.pop();
  job();
}

void Scheduler::triggerJS() {
  auto job = jsJobs.pop();
  job();
}

Scheduler::~Scheduler() {}

