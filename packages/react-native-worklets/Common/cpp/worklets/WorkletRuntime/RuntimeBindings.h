#pragma once

#include <jsi/jsi.h>

#include <functional>

using namespace facebook;

namespace worklets {

struct RuntimeBindings {
  using SendRequest = std::function<void(
      jsi::Runtime &rt,
      const jsi::Value &query,
      jsi::Function &&responseSender)>;

  using AbortRequest = std::function<void(jsi::Runtime &rt, double requestId)>;

  using ClearCookies =
      std::function<void(jsi::Runtime &rt, jsi::Function &&responseSender)>;

  using RequestAnimationFrame =
      std::function<void(std::function<void(const double)>)>;

  SendRequest sendRequest;
  AbortRequest abortRequest;
  ClearCookies clearCookies;
  RequestAnimationFrame requestAnimationFrame;
};

} // namespace worklets
