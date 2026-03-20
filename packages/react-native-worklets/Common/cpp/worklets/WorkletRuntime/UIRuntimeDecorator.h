#pragma once

#include <jsi/jsi.h>

namespace worklets {

class UIRuntimeDecorator {
 public:
  static void decorate(
      facebook::jsi::Runtime &uiRuntime,
      const std::function<void(facebook::jsi::Runtime &rt, const facebook::jsi::Value &callback)>
          &requestAnimationFrame);
};

} // namespace worklets
