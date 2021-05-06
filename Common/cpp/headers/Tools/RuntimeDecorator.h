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
                                const TimeProviderFunction& getCurrentTime,
                                const bool comparePointers = false); // to make compatibility with multithreading library.
  
  inline static bool isWorkletRuntime(jsi::Runtime& rt);
  inline static bool isReactRuntime(jsi::Runtime& rt);
private:
  static jsi::Runtime* runtimeUI;
  static bool comparePointers;
};

inline bool RuntimeDecorator::isWorkletRuntime(jsi::Runtime& rt) {
  if(comparePointers) {
    return runtimeUI == &rt;
  }
  else {
    auto isUi = rt.global().getProperty(rt, "_WORKLET");
    return isUi.isBool() && isUi.getBool();
  }
}

inline bool RuntimeDecorator::isReactRuntime(jsi::Runtime& rt) {
  if(comparePointers) {
    return runtimeUI != &rt;
  }
  else {
    return !isWorkletRuntime(rt);
  }
}

}
