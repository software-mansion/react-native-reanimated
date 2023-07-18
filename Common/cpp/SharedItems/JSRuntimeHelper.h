#pragma once

#include "JSScheduler.h"
#include "Scheduler.h"

#include <jsi/jsi.h>
#include <memory>
#include <utility>

using namespace facebook;

namespace reanimated {

class JSRuntimeHelper {
 private:
  jsi::Runtime *rnRuntime_; // React-Native's main JS runtime
  std::shared_ptr<Scheduler> scheduler_;
  std::shared_ptr<JSScheduler> jsScheduler_;

 public:
  JSRuntimeHelper(
      jsi::Runtime *rnRuntime,
      const std::shared_ptr<Scheduler> &scheduler,
      const std::shared_ptr<JSScheduler> &jsScheduler)
      : rnRuntime_(rnRuntime),
        scheduler_(scheduler),
        jsScheduler_(jsScheduler) {}

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

  void scheduleOnJS(std::function<void()> &&job) {
    jsScheduler_->scheduleOnJS(std::move(job));
  }
};

} // namespace reanimated
