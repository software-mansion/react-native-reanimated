#pragma once

#include "JSScheduler.h"
#include "UIScheduler.h"

#include <jsi/jsi.h>
#include <memory>
#include <utility>

using namespace facebook;

namespace reanimated {

class JSRuntimeHelper {
 private:
  jsi::Runtime *rnRuntime_; // React-Native's main JS runtime
  std::shared_ptr<UIScheduler> uiScheduler_;
  std::shared_ptr<JSScheduler> jsScheduler_;

 public:
  JSRuntimeHelper(
      jsi::Runtime *rnRuntime,
      const std::shared_ptr<UIScheduler> &uiScheduler,
      const std::shared_ptr<JSScheduler> &jsScheduler)
      : rnRuntime_(rnRuntime),
        uiScheduler_(uiScheduler),
        jsScheduler_(jsScheduler) {}

  volatile bool uiRuntimeDestroyed = false;

  inline jsi::Runtime *rnRuntime() const {
    return rnRuntime_;
  }

  inline bool isRNRuntime(const jsi::Runtime &rt) const {
    return &rt == rnRuntime_;
  }

  void scheduleOnUI(std::function<void()> &&job) {
    uiScheduler_->scheduleOnUI(std::move(job));
  }

  void scheduleOnJS(std::function<void()> &&job) {
    jsScheduler_->scheduleOnJS(std::move(job));
  }
};

} // namespace reanimated
