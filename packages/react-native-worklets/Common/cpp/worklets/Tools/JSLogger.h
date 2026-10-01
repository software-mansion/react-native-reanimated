#pragma once

#include <jsi/jsi.h>
#include <worklets/Tools/JSScheduler.h>

#include <memory>
#include <optional>
#include <string>

namespace worklets {

struct JSErrorData {
  std::string message;
  std::string stack;
  std::string name;
};

class JSLogger {
 public:
  explicit JSLogger(const std::shared_ptr<JSScheduler> &jsScheduler) : jsScheduler_(jsScheduler) {}
  void warnOnJS(const std::string &warning) const;

  static void
  reportFatalErrorOnJS(const std::shared_ptr<JSScheduler> &jsScheduler, JSErrorData &&jsErrorData, bool force = false);

#ifndef NDEBUG
  /**
   * Forwards a `jsi::JSError` raised on a worklet runtime to the RN runtime so
   * RN's LogBox can display it. The reported stack is rewritten to label each
   * frame with `runtimeName` and, when present, the `scheduleStack` is appended
   * so users can trace the error back to the JS call site that scheduled the
   * worklet.
   */
  static void handleJSError(
      const std::shared_ptr<JSScheduler> &jsScheduler,
      facebook::jsi::Runtime &workletRuntime,
      const std::string &runtimeName,
      facebook::jsi::JSError &error,
      const std::optional<std::string> &scheduleStack);
#endif // NDEBUG

 private:
  static void reportFatalErrorOnJS(jsi::Runtime &rnRuntime, const JSErrorData &jsErrorData, bool force = false);

  const std::shared_ptr<JSScheduler> jsScheduler_;
};

} // namespace worklets
