#pragma once

#include <jsi/jsi.h>

#include <functional>

using namespace facebook;

namespace worklets {

struct RuntimeBindings {
  using RequestAnimationFrame = std::function<void(std::function<void(const double)>)>;

  const RequestAnimationFrame requestAnimationFrame;

#if defined(__APPLE__) && defined(WORKLETS_BUNDLE_MODE) && defined(WORKLETS_FETCH_PREVIEW)
  using AbortRequest = std::function<void(jsi::Runtime &rt, double requestId)>;
  using ClearCookies = std::function<void(jsi::Runtime &rt, jsi::Function &&responseSender)>;
  using SendRequest = std::function<void(jsi::Runtime &rt, const jsi::Value &query, jsi::Function &&responseSender)>;

  const AbortRequest abortRequest;
  const ClearCookies clearCookies;
  const SendRequest sendRequest;
#endif // defined(__APPLE__) && defined(WORKLETS_BUNDLE_MODE) && defined(WORKLETS_FETCH_PREVIEW)
};

} // namespace worklets
