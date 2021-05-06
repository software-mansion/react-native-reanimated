#pragma once

#include "PlatformDepMethodsHolder.h"
#include <stdio.h>
#include <jsi/jsi.h>

using namespace facebook;

namespace reanimated {

using RequestFrameFunction = std::function<void(std::function<void(double)>)>;

class RuntimeDetectorStrategy {
public:
  virtual ~RuntimeDetectorStrategy() {}
  virtual inline bool isUIRuntime(jsi::Runtime& rt) = 0;
  virtual inline bool isWorkletRuntime(jsi::Runtime& rt) = 0;
  virtual inline bool isReactRuntime(jsi::Runtime& rt) = 0;
};

class DefaultRuntimeDetectorStrategy : public RuntimeDetectorStrategy {
public:

  inline bool isUIRuntime(jsi::Runtime& rt) override {
    auto isUi = rt.global().getProperty(rt, "_UI");
    return isUi.isBool() && isUi.getBool();
  }

  inline bool isWorkletRuntime(jsi::Runtime& rt) override {
    auto isWorklet = rt.global().getProperty(rt, "_WORKLET");
    return isWorklet.isBool() && isWorklet.getBool();
  }

  inline bool isReactRuntime(jsi::Runtime& rt) override {
    return !isWorkletRuntime(rt);
  }
};

class UIRuntimeDetectorStrategy : public RuntimeDetectorStrategy {
private:
  jsi::Runtime* runtimeUI;
public:
  UIRuntimeDetectorStrategy(jsi::Runtime& runtimeUI) : runtimeUI(&runtimeUI) {}
  
  inline bool isUIRuntime(jsi::Runtime& rt) override {
    return runtimeUI == &rt;
  }

  inline bool isWorkletRuntime(jsi::Runtime& rt) override {
    return runtimeUI == &rt;
  }

  inline bool isReactRuntime(jsi::Runtime& rt) override {
    return runtimeUI != &rt;
  }
};

class RuntimeDecorator {
public:
  static void decorateRuntime(jsi::Runtime& rt, const std::string& label);
  static void decorateUIRuntime(jsi::Runtime& rt,
                                const UpdaterFunction& updater,
                                const RequestFrameFunction& requestFrame,
                                const ScrollToFunction& scrollTo,
                                const MeasuringFunction& measure,
                                const TimeProviderFunction& getCurrentTime,
                                const bool comparePointers = false); // to make compatibility with multithreading library.

  /**
   Returns true if the given Runtime is the Reanimated UI-Thread Runtime.
   */
  inline static bool isUIRuntime(jsi::Runtime &rt);
  /**
   Returns true if the given Runtime is a Runtime that supports Workletization. (REA, Vision, ...)
   */
  inline static bool isWorkletRuntime(jsi::Runtime &rt);
  /**
   Returns true if the given Runtime is the default React-JS Runtime.
   */
  inline static bool isReactRuntime(jsi::Runtime &rt);

private:
  static std::unique_ptr<RuntimeDetectorStrategy> runtimeDetectorStrategy;
};

inline bool RuntimeDecorator::isUIRuntime(jsi::Runtime& rt) {
  return runtimeDetectorStrategy->isUIRuntime(rt);
}

inline bool RuntimeDecorator::isWorkletRuntime(jsi::Runtime& rt) {
  return runtimeDetectorStrategy->isWorkletRuntime(rt);
}

inline bool RuntimeDecorator::isReactRuntime(jsi::Runtime& rt) {
  return runtimeDetectorStrategy->isReactRuntime(rt);
}

}
