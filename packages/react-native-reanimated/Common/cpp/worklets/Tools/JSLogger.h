#pragma once

#include <worklets/Tools/JSScheduler.h>

#include <memory>
#include <string>

namespace worklets {

class JSLogger {
 public:
  explicit JSLogger(const std::shared_ptr<JSScheduler> &jsScheduler)
      : jsScheduler_(jsScheduler) {}
  void warnOnJS(const std::string &warning) const;

 private:
  const std::shared_ptr<JSScheduler> jsScheduler_;
};

} // namespace worklets
