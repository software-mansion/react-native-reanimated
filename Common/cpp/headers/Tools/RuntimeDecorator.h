#pragma once

#include <stdio.h>
#include <jsi/jsi.h>

namespace reanimated {

using namespace facebook;

using UpdaterFunction = std::function<void(jsi::Runtime &rt, int viewTag, const jsi::Object& object)>;
using RequestFrameFunction = std::function<void(std::function<void(double)>)>;

class RuntimeDecorator {
public:
  static void addNativeObjects(jsi::Runtime &rt, UpdaterFunction updater, RequestFrameFunction requestFrame);
};

}
