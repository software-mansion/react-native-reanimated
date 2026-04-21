#pragma once

#include <jsi/jsi.h>

#include <functional>

using namespace facebook;

namespace worklets {

struct RuntimeBindings {
  using RequestAnimationFrame = std::function<void(std::function<void(const double)>)>;

  const RequestAnimationFrame requestAnimationFrame;
  // Host function extracted from RN runtime's `global.nativeLoggingHook`, used
  // to forward logs from Worklet runtimes to the native console in Bundle Mode.
  // Signature:
  //   jsi::Value(jsi::Runtime &rt, const jsi::Value &thisVal,
  //              const jsi::Value *args, size_t count)
  // where args[0] is the message string and args[1] is the log level (double).
  jsi::HostFunctionType nativeLoggingHook;

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

} // namespace worklets
