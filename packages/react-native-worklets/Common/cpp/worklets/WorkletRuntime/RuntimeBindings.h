#pragma once

#include <jsi/jsi.h>

#include <functional>

using namespace facebook;

namespace worklets {

struct RuntimeBindings {
  using RequestAnimationFrame = std::function<void(std::function<void(const double)>)>;

  const RequestAnimationFrame requestAnimationFrame;

#if defined(WORKLETS_BUNDLE_MODE) && defined(WORKLETS_FETCH_PREVIEW)
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
#endif // defined(WORKLETS_BUNDLE_MODE) && defined(WORKLETS_FETCH_PREVIEW)
};

} // namespace worklets
