#pragma once

#include <react/renderer/components/rnreanimated/Props.h>

#include <reanimated/CSS/config/CSSTransitionConfig.h>
#include <reanimated/CSS/core/CSSTransition.h>
#include <reanimated/Fabric/operations/OperationsLoop.h>

#include <folly/dynamic.h>
#include <memory>
#include <optional>
#include <unordered_set>
#include <utility>

namespace facebook::react {

using namespace reanimated;
using namespace css;

class CSSTransitionManager {
 public:
  CSSTransitionManager(
      std::shared_ptr<OperationsLoop> operationsLoop,
      std::shared_ptr<ViewStylesRepository> viewStylesRepository);

  ~CSSTransitionManager();

  folly::dynamic getCurrentFrameProps(const ShadowNode::Shared &shadowNode);

  void update(
      const ReanimatedViewProps &oldProps,
      const ReanimatedViewProps &newProps);

 private:
  std::shared_ptr<CSSTransition> transition_;
  OperationsLoop::OperationHandle operationHandle_;

  // TODO - think of better way of running interrupted transitions without
  // storing last frame result
  folly::dynamic lastFrameProps_ = folly::dynamic::object();

  std::shared_ptr<OperationsLoop> operationsLoop_;
  std::shared_ptr<ViewStylesRepository> viewStylesRepository_;

  void updateTransitionInstance(
      const folly::dynamic &oldConfig,
      const folly::dynamic &newConfig);
  void runTransitionForChangedProperties(
      const folly::dynamic &oldProps,
      const folly::dynamic &newProps);

  void createTransition(const folly::dynamic &config);
  void removeTransition();
  void updateTransition(
      const folly::dynamic &oldConfig,
      const folly::dynamic &newConfig);
  void runTransition(ChangedProps &&changedProps);
};

} // namespace facebook::react
