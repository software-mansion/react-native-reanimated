#pragma once

#include <react/renderer/components/rnreanimated/Props.h>

#include <reanimated/CSS/config/CSSTransitionConfig.h>
#include <reanimated/CSS/core/CSSTransition.h>
#include <reanimated/CSS/util/DelayedItemsManager.h>
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

  ~CSSTransitionManager();

  folly::dynamic getCurrentFrameProps(
      const ShadowNode::Shared &shadowNode) const;

  void update(
      const ReanimatedViewProps &oldProps,
      const ReanimatedViewProps &newProps);

 private:
  std::optional<CSSTransition> transition_;
  OperationsLoop::OperationHandle operationHandle_{0};
  DelayedItemsManager<Tag> delayedTransitionsManager_;

  std::shared_ptr<OperationsLoop> operationsLoop_;
  std::shared_ptr<ViewStylesRepository> viewStylesRepository_;

  void createTransition(const folly::dynamic &config);
  void removeTransition();
  // void updateTransition(const CSSTransition &transition);
  void scheduleOrActivateTransition(const CSSTransition &transition);
};

} // namespace reanimated::css
