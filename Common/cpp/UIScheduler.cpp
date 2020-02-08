//
// Created by Szymon Kapala on 2020-02-07.
//

#include "UIScheduler.h"

void UIScheduler::schedule(std::function<void()> job) {
  jobs.push(job);
}

UIScheduler::~UIScheduler() {}

void UIScheduler::trigger() {
  auto job = jobs.pop();
  job();
}