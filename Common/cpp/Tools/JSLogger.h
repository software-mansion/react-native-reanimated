#ifdef DEBUG

#pragma once

#include "LayoutAnimationType.h"
#include "Shareables.h"

#include <memory>
#include <string>

namespace reanimated {

class JSLogger {
 public:
  explicit JSLogger(const std::shared_ptr<JSRuntimeHelper> &runtimeHelper);
  void warnOnJS(const std::string &warning) const;

 private:
  const std::shared_ptr<JSRuntimeHelper> runtimeHelper_;
};

} // namespace reanimated

#endif // DEBUG
