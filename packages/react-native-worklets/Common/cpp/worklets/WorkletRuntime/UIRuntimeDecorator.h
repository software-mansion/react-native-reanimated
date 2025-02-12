#pragma once

#include <jsi/jsi.h>

namespace worklets {

class UIRuntimeDecorator {
 public:
  static void decorate(facebook::jsi::Runtime &uiRuntime);
};

} // namespace worklets
