#pragma once

#ifdef ANDROID
#include <folly/dynamic.h>
#endif

#include <reanimated/CSS/core/CSSTransition.h>

#include <optional>

namespace facebook::react {

using namespace reanimated::css;

class ReanimatedViewState {
 public:
  std::shared_ptr<CSSTransition> cssTransition;

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
