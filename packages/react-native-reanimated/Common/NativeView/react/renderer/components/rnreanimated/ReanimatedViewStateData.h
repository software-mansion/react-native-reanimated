#pragma once

#ifdef ANDROID
#include <folly/dynamic.h>
#endif

#include <reanimated/CSS/manager/CSSTransitionManager.h>
#include <reanimated/CSS/misc/ViewStylesRepository.h>
#include <reanimated/Fabric/OperationsLoop.h>

#include <memory>
#include <optional>

namespace facebook::react {

using namespace reanimated;
using namespace css;

class ReanimatedViewStateData {
 public:
  std::unique_ptr<CSSTransitionManager> cssTransitionManager;

  ReanimatedViewStateData() = default;

  void initialize(
      const std::shared_ptr<OperationsLoop> &operationsLoop,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

#ifdef ANDROID
  ReanimatedViewStateData(
      ReanimatedViewStateData const &previousState,
      folly::dynamic data) {}
  folly::dynamic getDynamic() const {
    return {};
  }
#endif
};

} // namespace facebook::react
