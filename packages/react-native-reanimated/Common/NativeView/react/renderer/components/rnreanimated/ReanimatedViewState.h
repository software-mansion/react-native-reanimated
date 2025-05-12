#pragma once

#ifdef ANDROID
#include <folly/dynamic.h>
#endif

namespace facebook::react {

class ReanimatedViewState {
 public:
  ReanimatedViewState() = default;

#ifdef ANDROID
  ReanimatedViewState(
      ReanimatedViewState const &previousState,
      folly::dynamic data) {}
  folly::dynamic getDynamic() const {
    return {};
  }
#endif
};

} // namespace facebook::react
