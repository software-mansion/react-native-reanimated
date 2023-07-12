#pragma once

#include "Scheduler.h"

#include <jsi/jsi.h>
#include <memory>

using namespace facebook;

namespace reanimated {

class JSRuntimeHelper {
 private:
  jsi::Runtime *rnRuntime_; // React-Native's main JS runtime
  std::shared_ptr<Scheduler> scheduler_;

 public:
  JSRuntimeHelper(
      jsi::Runtime *rnRuntime,
      const std::shared_ptr<Scheduler> &scheduler)
      : rnRuntime_(rnRuntime), scheduler_(scheduler) {}

  volatile bool uiRuntimeDestroyed = false;

  inline jsi::Runtime *rnRuntime() const {
    return rnRuntime_;
  }

  inline bool isRNRuntime(const jsi::Runtime &rt) const {
    return &rt == rnRuntime_;
  }

  void scheduleOnUI(std::function<void()> job) {
    scheduler_->scheduleOnUI(job);
  }

  void scheduleOnJS(std::function<void()> job) {
    scheduler_->scheduleOnJS(job);
  }
};

} // namespace reanimated
