#pragma once

#ifdef ANDROID
#include <folly/dynamic.h>
#endif

#include <react/renderer/components/rnreanimated/managers/CSSAnimationsManager.h>
#include <react/renderer/components/rnreanimated/managers/CSSTransitionManager.h>

#include <reanimated/CSS/misc/ViewStylesRepository.h>
#include <reanimated/Fabric/operations/OperationsLoop.h>

#include <memory>
#include <optional>

namespace facebook::react {

using namespace reanimated;
using namespace css;

class ReanimatedViewStateData {
 public:
  std::shared_ptr<CSSTransitionManager> cssTransitionManager;

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
