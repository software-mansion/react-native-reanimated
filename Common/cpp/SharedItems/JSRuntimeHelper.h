#pragma once

#include <jsi/jsi.h>

#include <memory>
#include <string>

#ifdef __APPLE__
#include <RNReanimated/Scheduler.h>
#else
#include "Scheduler.h"
#endif

using namespace facebook;

namespace reanimated {

class JSRuntimeHelper;

// Core functions are not allowed to capture outside variables, otherwise they'd
// try to access _closure variable which is something we want to avoid for
// simplicity reasons.
class CoreFunction {
 private:
  std::unique_ptr<jsi::Function> rnFunction_;
  std::unique_ptr<jsi::Function> uiFunction_;
  std::string functionBody_;
  std::string location_;
  JSRuntimeHelper
      *runtimeHelper_; // runtime helper holds core function references, so we
  // use normal pointer here to avoid ref cycles.
  std::unique_ptr<jsi::Function> &getFunction(jsi::Runtime &rt);

 public:
  CoreFunction(JSRuntimeHelper *runtimeHelper, const jsi::Value &workletObject);
  template <typename... Args>
  jsi::Value call(jsi::Runtime &rt, Args &&...args) {
    return getFunction(rt)->call(rt, args...);
  }
};

class JSRuntimeHelper {
 private:
  jsi::Runtime *rnRuntime_; // React-Native's main JS runtime
  jsi::Runtime *uiRuntime_; // UI runtime created by Reanimated
  std::shared_ptr<Scheduler> scheduler_;

 public:
  JSRuntimeHelper(
      jsi::Runtime *rnRuntime,
      jsi::Runtime *uiRuntime,
      const std::shared_ptr<Scheduler> &scheduler)
      : rnRuntime_(rnRuntime), uiRuntime_(uiRuntime), scheduler_(scheduler) {}

  volatile bool uiRuntimeDestroyed = false;
  std::unique_ptr<CoreFunction> callGuard;
  std::unique_ptr<CoreFunction> valueUnpacker;

  inline jsi::Runtime *uiRuntime() const {
    return uiRuntime_;
  }

  inline jsi::Runtime *rnRuntime() const {
    return rnRuntime_;
  }

  inline bool isUIRuntime(const jsi::Runtime &rt) const {
    return &rt == uiRuntime_;
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

  template <typename... Args>
  inline void runOnUIGuarded(const jsi::Value &function, Args &&...args) {
    // We only use callGuard in debug mode, otherwise we call the provided
    // function directly. CallGuard provides a way of capturing exceptions in
    // JavaScript and propagating them to the main React Native thread such that
    // they can be presented using RN's LogBox.
    jsi::Runtime &rt = *uiRuntime_;
#ifdef DEBUG
    callGuard->call(rt, function, args...);
#else
    function.asObject(rt).asFunction(rt).call(rt, args...);
#endif
  }
};

} // namespace reanimated
