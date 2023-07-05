#pragma once

#include "LayoutAnimationType.h"
#include "Shareables.h"

#include <memory>
#include <string>

namespace reanimated {

class JSLogger {
 public:
  JSLogger();
  explicit JSLogger(const std::shared_ptr<JSRuntimeHelper> &runtimeHelper);
  void warnOnJs(std::string warning) const;

 private:
  const std::shared_ptr<JSRuntimeHelper> runtimeHelper;
};

} // namespace reanimated
