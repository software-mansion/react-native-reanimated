#pragma once

#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/core/transition/CSSLoopTransition.h>
#include <reanimated/CSS/core/transition/CSSPlatformTransition.h>
#include <reanimated/CSS/core/transition/CSSPlatformTransitionProxy.h>
#include <reanimated/CSS/misc/ViewStylesRepository.h>
#include <reanimated/Fabric/updates/OperationsLoop.h>

#include <react/renderer/core/ShadowNode.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <memory>
#include <string>
#include <vector>

namespace reanimated::css {

class CSSTransition {
 public:
  class Observer {
   public:
    virtual ~Observer() = default;
    virtual void onTransitionUpdate(Tag viewTag) = 0;
  };

  CSSTransition(
      std::shared_ptr<const ShadowNode> shadowNode,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const std::shared_ptr<CSSPlatformTransitionProxy> &platformTransitionProxy,
      const std::shared_ptr<OperationsLoop> &loop,
      Observer &observer);
  ~CSSTransition();

  Tag getViewTag() const {
    return shadowNode_->getTag();
  }

  std::shared_ptr<const ShadowNode> getShadowNode() const {
    return shadowNode_;
  }

  ShadowNodeFamily::Shared getShadowNodeFamily() const {
    return shadowNode_->getFamilyShared();
  }

  TransitionProperties getProperties() const;

  folly::dynamic computeCurrentLoopStyle();

  /// Applies a config: routes props between the platform and loop sides and runs them.
  folly::dynamic run(jsi::Runtime &rt, CSSTransitionConfig &&config, const folly::dynamic &lastUpdates);
  /// Runs the loop side directly from already-computed (dynamic) diffs.
  folly::dynamic run(const PropertyValueDynamicDiffsMap &propertyDiffs, const folly::dynamic &lastUpdates);
  void cancel();

 private:
  const std::shared_ptr<const ShadowNode> shadowNode_;
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;
  const std::shared_ptr<CSSPlatformTransitionProxy> platformTransitionProxy_;
  const std::shared_ptr<OperationsLoop> loop_;
  Observer &observer_;

  CSSTransitionRouting routing_;
  std::unique_ptr<CSSPlatformTransition> platformTransition_;
  std::shared_ptr<CSSLoopTransition> loopTransition_;

  CSSPlatformTransition &ensurePlatformTransition();
  CSSLoopTransition &ensureLoopTransition();
  void scheduleLoop(double timestamp);
};

} // namespace reanimated::css
