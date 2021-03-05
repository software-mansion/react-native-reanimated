#pragma once

#include "PlatformDepMethodsHolder.h"
#include <stdio.h>
#include <jsi/jsi.h>

using namespace facebook;

namespace reanimated {

using RequestFrameFunction = std::function<void(std::function<void(double)>)>;

class RuntimeDecorator {
public:
  static void decorateUIRuntime(jsi::Runtime &rt,
                                UpdaterFunction updater,
                                RequestFrameFunction requestFrame,
                                ScrollToFunction scrollTo,
                                MeasuringFunction measure,
                                TimeProviderFunction getCurrentTime);
  
  static bool isUIRuntime(jsi::Runtime &rt);
};

}
