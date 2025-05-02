#pragma once

#include <reanimated/CSS/config/CSSTransitionConfig.h>
#include <reanimated/CSS/core/CSSTransition.h>
#include <reanimated/Fabric/OperationsLoop.h>

#include <memory>

namespace reanimated::css {

class CSSTransitionManager {
 public:
  explicit CSSTransitionManager(
      const CSSTransitionConfig &config,
      const ShadowNode::Shared &shadowNode,
      std::shared_ptr<OperationsLoop> operationsLoop,
      std::shared_ptr<ViewStylesRepository> viewStylesRepository);

  folly::dynamic getCurrentFrameProps() const;
  void updateTransition(const CSSTransitionConfig &config);

 private:
  CSSTransition transition_;
  OperationsLoop::OperationHandle operationHandle_{0};

  std::shared_ptr<OperationsLoop> operationsLoop_;
  std::shared_ptr<ViewStylesRepository> viewStylesRepository_;

  void unregisterFromOperationsLoop();
};

} // namespace reanimated::css
