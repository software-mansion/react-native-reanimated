#pragma once

#include <jsi/jsi.h>

#include <functional>
#include <stdexcept>

using namespace facebook;

namespace worklets {

struct RuntimeBindings {
  using RequestAnimationFrame = std::function<void(std::function<void(const double)>)>;
  // Host function extracted from RN runtime's `global.nativeLoggingHook`, used
  // to forward logs from Worklet runtimes to the native console in Bundle Mode.
  // Signature:
  //   jsi::Value(jsi::Runtime &rt, const jsi::Value &thisVal,
  //              const jsi::Value *args, size_t count)
  // where args[0] is the message string and args[1] is the log level (double).
  // https://github.com/facebook/react-native/blob/654d64655ab3e3319fdfd4bfbe1c19c0b1233ff8/packages/react-native/ReactCommon/jsitooling/react/runtime/JSRuntimeBindings.cpp
  using NativeLoggingHook = jsi::HostFunctionType;

  const RequestAnimationFrame requestAnimationFrame;
  const NativeLoggingHook nativeLoggingHook;
};

inline RuntimeBindings::NativeLoggingHook extractNativeLoggingHookFromRNRuntime(jsi::Runtime &rnRuntime) {
  auto nativeLoggingHookValue = rnRuntime.global().getProperty(rnRuntime, "nativeLoggingHook");
  if (!nativeLoggingHookValue.isObject() || !nativeLoggingHookValue.asObject(rnRuntime).isFunction(rnRuntime)) {
    throw std::runtime_error("[Worklets] nativeLoggingHook is missing.");
  }
  return nativeLoggingHookValue.asObject(rnRuntime).asFunction(rnRuntime).getHostFunction(rnRuntime);
}

} // namespace worklets
