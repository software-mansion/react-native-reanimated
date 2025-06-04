#pragma once

#include <react/renderer/components/rnreanimated/ReanimatedNodeProps.h>

#include <reanimated/CSS/config/CSSTransitionConfig.h>
#include <reanimated/CSS/core/CSSTransition.h>
#include <reanimated/Fabric/operations/OperationsLoop.h>

#include <folly/dynamic.h>
#include <memory>
#include <utility>

namespace facebook::react {

using namespace reanimated;
using namespace css;

class CSSTransitionManager {
 public:
  CSSTransitionManager(
      std::shared_ptr<ViewStylesRepository> viewStylesRepository);

  // Non-copyable
  CSSTransitionManager(const CSSTransitionManager &) = delete;
  CSSTransitionManager &operator=(const CSSTransitionManager &) = delete;

  // Non-movable
  CSSTransitionManager(CSSTransitionManager &&) = delete;
  CSSTransitionManager &operator=(CSSTransitionManager &&) = delete;

  void onPropsChange(
      double timestamp,
      const ReanimatedNodeProps &oldProps,
      const ReanimatedNodeProps &newProps);
  folly::dynamic onFrame(
      double timestamp,
      const ShadowNode::Shared &shadowNode);

 private:
  std::shared_ptr<CSSTransition> transition_;

  // TODO - think of better way of running interrupted transitions without
  // storing last frame result
  folly::dynamic lastFrameProps_ = folly::dynamic::object();

  std::shared_ptr<ViewStylesRepository> viewStylesRepository_;

  void updateTransitionInstance(
      const std::optional<CSSTransitionConfig> &oldConfig,
      const std::optional<CSSTransitionConfig> &newConfig);
  void runTransitionForChangedProperties(
      double timestamp,
      const folly::dynamic &oldProps,
      const folly::dynamic &newProps);
};

} // namespace facebook::react
