#pragma once

#include <jsi/jsi.h>
#include <memory>
#include <unordered_map>

#include "Shareables.h"

using namespace facebook;

namespace reanimated {

class JSConfigManager {
 public:
  void setRuntimeHelper(const std::shared_ptr<JSRuntimeHelper> runtimeHelper);
  void setConfigValue(const JSConfigType type, const jsi::Value &config);
  jsi::Value getConfigValue(const JSConfigType type, const int key);
  SharedTransitionType getSharedTansitionConfig(const int key);
  void clearSharedTansitionConfig(const int key);

 private:
  std::shared_ptr<JSRuntimeHelper> runtimeHelper_;
  std::unordered_map<int, SharedTransitionType> sharedTransitionConfig_;
  void setSharedTansitionConfig(jsi::Runtime &rt, const jsi::Value &config);
};

} // namespace reanimated
