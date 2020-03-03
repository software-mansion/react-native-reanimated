//
// Created by Szymon Kapala on 2020-02-07.
//

#include "Scheduler.h"

void Scheduler::scheduleOnUI(std::function<void()> job) {
  uiJobs.push(job);
}

void Scheduler::scheduleOnJS(std::function<void()> job) {
  jsJobs.push(job);
}

void Scheduler::triggerUI() {
  auto job = uiJobs.pop();
  job();
}

void Scheduler::triggerJS() {
  auto job = jsJobs.pop();
  job();
}

Scheduler::~Scheduler() {}

