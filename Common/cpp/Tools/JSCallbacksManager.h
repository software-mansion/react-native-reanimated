#pragma once

#include <memory>
#include <vector>
#include <jsi/jsi.h>

#include "Shareables.h"

using namespace facebook;

namespace reanimated {

class JSCallbacksManager {

  std::vector<std::function<jsi::Value(double)>> callbacks_;
  
public:
  std::shared_ptr<JSRuntimeHelper> runtimeHelper_;
  JSCallbacksManager(std::shared_ptr<JSRuntimeHelper> runtimeHelper, PlatformDepMethodsHolder platformDepMethodsHolder);
  jsi::Value registerJSCallback(
    jsi::Runtime &rt,
    const jsi::Value &type,
    const jsi::Value &configuration,
    const jsi::Value &callback);
  void unregisterJSCallback(
    jsi::Runtime &rt,
    const jsi::Value &type,
    const jsi::Value &callbackId);
  jsi::Value tmp(double progress);
  
};

} // reanimated
