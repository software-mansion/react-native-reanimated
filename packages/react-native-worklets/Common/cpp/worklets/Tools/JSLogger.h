#pragma once

#include <worklets/Tools/JSScheduler.h>

#include <memory>
#include <string>

namespace worklets {

struct JSErrorData {
  std::string message;
  std::string stack;
  std::string name;
  std::string jsEngine;
};

class JSLogger {
 public:
  explicit JSLogger(const std::shared_ptr<JSScheduler> &jsScheduler)
      : jsScheduler_(jsScheduler) {}
  void warnOnJS(const std::string &warning) const;

  static void reportFatalErrorOnJS(
      const std::shared_ptr<JSScheduler> &jsScheduler,
      JSErrorData &&jsErrorData,
      bool force = false);

 private:
  static void reportFatalErrorOnJS(
      jsi::Runtime &rnRuntime,
      const JSErrorData &jsErrorData,
      bool force = false);

  const std::shared_ptr<JSScheduler> jsScheduler_;
};

} // namespace worklets
