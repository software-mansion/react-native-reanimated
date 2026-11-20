#pragma once

#include <jsi/jsi.h>

#include <functional>
#include <stdexcept>
#include <string>

#if defined(__APPLE__) && defined(__OBJC__)
#import <React/RCTLog.h>
#elif defined(ANDROID)
#include <android/log.h>
#endif

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

#ifdef WORKLETS_FETCH_PREVIEW_ENABLED
  using AbortRequest = std::function<void(jsi::Runtime &rt, double requestId)>;
  using ClearCookies = std::function<void(jsi::Runtime &rt, jsi::Function &&responseSender)>;
#ifdef ANDROID
  using SendRequest = std::function<void(
      jsi::Runtime &rt,
      jsi::String &method,
      jsi::String &url,
      double requestId,
      jsi::Array &headers,
      jsi::Object &data,
      jsi::String &responseType,
      bool incrementalUpdates,
      double timeout,
      bool withCredentials)>;
#else
  using SendRequest = std::function<void(jsi::Runtime &rt, const jsi::Value &query, jsi::Function &&responseSender)>;
#endif // ANDROID

  const AbortRequest abortRequest;
  const ClearCookies clearCookies;
  const SendRequest sendRequest;
#endif // WORKLETS_FETCH_PREVIEW_ENABLED
};

#if defined(ANDROID) || (defined(__APPLE__) && defined(__OBJC__))
inline RuntimeBindings::NativeLoggingHook makeNativeLoggingHook() {
  return [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) -> jsi::Value {
    if (count != 2) {
      throw std::invalid_argument("nativeLoggingHook takes 2 arguments");
    }
    const auto message = args[0].asString(rt).utf8(rt);
    const auto logLevel = static_cast<unsigned int>(args[1].asNumber());
#if defined(__APPLE__)
    _RCTLogJavaScriptInternal(static_cast<RCTLogLevel>(logLevel), [NSString stringWithUTF8String:message.c_str()]);
#else
    __android_log_write(
        static_cast<android_LogPriority>(logLevel + ANDROID_LOG_DEBUG), "ReactNativeJS", message.c_str());
#endif
    return jsi::Value::undefined();
  };
}
#endif // defined(ANDROID) || (defined(__APPLE__) && defined(__OBJC__))

} // namespace worklets
