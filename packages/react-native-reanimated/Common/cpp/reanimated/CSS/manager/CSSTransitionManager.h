#pragma once

#include <reanimated/CSS/config/CSSTransitionConfig.h>
#include <reanimated/CSS/core/CSSTransition.h>
#include <reanimated/Fabric/OperationsLoop.h>

#include <folly/dynamic.h>
#include <memory>
#include <optional>
#include <utility>

namespace reanimated::css {

class CSSTransitionManager {
 public:
  CSSTransitionManager(
      std::shared_ptr<OperationsLoop> operationsLoop,
      std::shared_ptr<ViewStylesRepository> viewStylesRepository);

  folly::dynamic getCurrentFrameProps() const;

 private:
  std::optional<CSSTransition> transition_;
  OperationsLoop::OperationHandle operationHandle_{0};

  std::shared_ptr<OperationsLoop> operationsLoop_;
  std::shared_ptr<ViewStylesRepository> viewStylesRepository_;

  void unregisterFromOperationsLoop();
};

} // namespace reanimated::css
