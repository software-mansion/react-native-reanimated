#pragma once

#include "PlatformDepMethodsHolder.h"
#include <stdio.h>
#include <jsi/jsi.h>

using namespace facebook;

namespace reanimated {

using RequestFrameFunction = std::function<void(std::function<void(double)>)>;

class RuntimeDecorator {
public:
  static void decorateRuntime(jsi::Runtime& rt, const std::string& label);
  static void decorateUIRuntime(jsi::Runtime& rt,
                                const UpdaterFunction& updater,
                                const RequestFrameFunction& requestFrame,
                                const ScrollToFunction& scrollTo,
                                const MeasuringFunction& measure,
                                const TimeProviderFunction& getCurrentTime);
  
  inline static bool isWorkletRuntime(const jsi::Runtime& rt);
  inline static bool isReactRuntime(const jsi::Runtime& rt);
private:
  static jsi::Runtime* runtimeUI;
};

inline bool RuntimeDecorator::isWorkletRuntime(const jsi::Runtime& rt) {
  return runtimeUI == &rt;
}

inline bool RuntimeDecorator::isReactRuntime(const jsi::Runtime& rt) {
  return runtimeUI != &rt;
}

}
