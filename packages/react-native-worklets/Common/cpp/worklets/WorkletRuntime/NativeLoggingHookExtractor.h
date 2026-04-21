#pragma once

#include <jsi/jsi.h>

#include <stdexcept>

using namespace facebook;

namespace worklets {

// Extracts `global.nativeLoggingHook` from the RN runtime so it can be
// reinstalled on Worklet runtimes in Bundle Mode
inline jsi::HostFunctionType extractNativeLoggingHookFromRNRuntime(jsi::Runtime &rnRuntime) {
  auto nativeLoggingHookValue = rnRuntime.global().getProperty(rnRuntime, "nativeLoggingHook");
  if (!nativeLoggingHookValue.isObject() || !nativeLoggingHookValue.asObject(rnRuntime).isFunction(rnRuntime)) {
    throw std::runtime_error("[Worklets] nativeLoggingHook is missing.");
  }
  return nativeLoggingHookValue.asObject(rnRuntime).asFunction(rnRuntime).getHostFunction(rnRuntime);
}

} // namespace worklets
