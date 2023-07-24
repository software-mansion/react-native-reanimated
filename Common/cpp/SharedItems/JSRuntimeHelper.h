#pragma once

#include <jsi/jsi.h>

#include <memory>
#include <string>
#include <utility>

#include "JSScheduler.h"
#include "UIScheduler.h"

using namespace facebook;

namespace reanimated {

class JSRuntimeHelper {
 private:
  jsi::Runtime *rnRuntime_; // React-Native's main JS runtime
  jsi::Runtime *uiRuntime_; // UI runtime created by Reanimated
  std::shared_ptr<UIScheduler> uiScheduler_;
  std::shared_ptr<JSScheduler> jsScheduler_;

 public:
  JSRuntimeHelper(
      jsi::Runtime *rnRuntime,
      jsi::Runtime *uiRuntime,
      const std::shared_ptr<UIScheduler> &uiScheduler,
      const std::shared_ptr<JSScheduler> &jsScheduler)
      : rnRuntime_(rnRuntime),
        uiRuntime_(uiRuntime),
        uiScheduler_(uiScheduler),
        jsScheduler_(jsScheduler) {}

  volatile bool uiRuntimeDestroyed = false;

  inline jsi::Runtime *rnRuntime() const {
    return rnRuntime_;
  }

  inline bool isRNRuntime(const jsi::Runtime &rt) const {
    return &rt == rnRuntime_;
  }

  void scheduleOnUI(std::function<void()> job) {
    uiScheduler_->scheduleOnUI(job);
  }

  void scheduleOnJS(std::function<void()> job) {
    jsScheduler_->scheduleOnJS(job);
  }
};

} // namespace reanimated
