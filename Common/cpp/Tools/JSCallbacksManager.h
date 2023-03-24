#pragma once

#include <memory>
#include <map>
#include <jsi/jsi.h>

#include "Shareables.h"

using namespace facebook;

namespace reanimated {

class JSCallbacksManager {

  std::map<int, std::function<jsi::Value(const jsi::Value &, const double)>> sharedAnimationProgressCallback_;
  std::shared_ptr<JSRuntimeHelper> runtimeHelper_;
  
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
  void unregisterJSCallback(const JSCallbackType type, const int callbackId);
  void setRuntimeHelper(const std::shared_ptr<JSRuntimeHelper> runtimeHelper);
  std::shared_ptr<JSRuntimeHelper> getRuntimeHelper();
  jsi::Value executeSharedAnimationProgressCallback(
    const int viewTag, 
    const double progress, 
    const jsi::Value &sharedAnimationWorkletData
  );

private:
  void addSharedAnimationProgressCallback(
    const std::shared_ptr<Shareable> shareableCallback,
    const jsi::Value &configuration
  );
  
};

} // reanimated
