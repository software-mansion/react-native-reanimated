#pragma once

#include <memory>
#include <map>
#include <jsi/jsi.h>

#include "Shareables.h"

using namespace facebook;

namespace reanimated {

class JSConfigManager {
public:
  JSConfigManager(std::shared_ptr<JSRuntimeHelper> runtimeHelper);
  void setConfigValue(const JSConfigType type, const jsi::Value &config);
  jsi::Value getConfigValue(const JSConfigType type, const int key);
  SharedTransitionType getSharedTansitionConfig(const int key);

private:
  std::shared_ptr<JSRuntimeHelper> runtimeHelper_;
  std::unordered_map<int, SharedTransitionType> sharedTransitionConfig_;
  void setSharedTansitionConfig(jsi::Runtime &rt, const jsi::Value &config);

};

} // namespace reanimated
