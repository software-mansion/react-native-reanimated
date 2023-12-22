#pragma once

#if __has_include( \
    <React-Codegen/rnreanimatedJSI.h>) // CocoaPod headers on Apple
#include <React-Codegen/rnreanimatedJSI.h>
#elif __has_include("rnreanimatedJSI.h") // CMake headers on Android
#include "rnreanimatedJSI.h"
#endif
#include <memory>
#include <string>

namespace facebook::react {

class REATurboCppModule
    : public NativeREATurboCppModuleCxxSpec<REATurboCppModule> {
 public:
  explicit REATurboCppModule(std::shared_ptr<CallInvoker> jsInvoker);

  bool installBridgeless(jsi::Runtime &rt, jsi::String valueUnpackerCode);
};

} // namespace facebook::react
