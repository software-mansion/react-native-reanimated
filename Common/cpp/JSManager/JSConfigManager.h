#pragma once

#include <jsi/jsi.h>
#include <memory>
#include <unordered_map>

#include "Consts.h"
#include "Shareables.h"

using namespace facebook;

namespace reanimated {

class JSConfigManager {
 public:
  void setRuntimeHelper(const std::shared_ptr<JSRuntimeHelper> runtimeHelper);
  void setConfigValue(const JSConfigType type, const jsi::Value &config);
  jsi::Value getConfigValue(const JSConfigType type, const int key);
  SharedTransitionType getSharedTransitionConfig(const int key);
  void clearSharedTransitionConfig(const int key);

 private:
  std::shared_ptr<JSRuntimeHelper> runtimeHelper_;
  std::unordered_map<int, SharedTransitionType> sharedTransitionConfig_;
  void setSharedTransitionConfig(jsi::Runtime &rt, const jsi::Value &config);
};

} // namespace reanimated
