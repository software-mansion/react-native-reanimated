#pragma once

#include <memory>
#include <jsi/jsi.h>

#include "Shareables.h"
#include "PlatformDepMethodsHolder.h"

using namespace facebook;

namespace reanimated {

class JSCallbacksManager {

  std::shared_ptr<JSRuntimeHelper> runtimeHelper_;
  RegisterJSCallbackFunction registerJSCallbackFunction_;
  UnregisterJSCallbackFunction unregisterJSCallbackFunction_;
  
public:
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
  
};

} // reanimated
