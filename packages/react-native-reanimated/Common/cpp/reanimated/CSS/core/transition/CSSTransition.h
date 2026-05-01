#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/core/transition/CSSLoopTransition.h>
#include <reanimated/CSS/core/transition/CSSPlatformTransition.h>
#include <reanimated/CSS/core/transition/CSSPlatformTransitionProxy.h>
#include <reanimated/Fabric/updates/OperationsLoop.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <memory>
#include <unordered_set>

namespace reanimated::css {

class CSSTransition {
 public:
  CSSTransition(
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const std::shared_ptr<std::unordered_set<Tag>> &updatedViewTags,
      const std::shared_ptr<OperationsLoop> &loop,
      const std::shared_ptr<CSSPlatformTransitionProxy> &platformTransitionProxy);
  ~CSSTransition();

  Tag getViewTag() const;
  ShadowNodeFamily::Shared getFamilyShared() const;
  TransitionProperties collectProperties() const;

  folly::dynamic
  run(jsi::Runtime &rt, CSSTransitionConfig &&config, const folly::dynamic &lastUpdateValue, double timestamp);
  folly::dynamic computeCurrentLoopStyle();

 private:
  folly::dynamic
  runLoop(jsi::Runtime &rt, const CSSTransitionConfig &config, const folly::dynamic &lastUpdates, double timestamp);
  void runPlatform(jsi::Runtime &rt, const CSSTransitionConfig &config, double timestamp);

  const std::shared_ptr<const ShadowNode> shadowNode_;
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;
  const std::shared_ptr<std::unordered_set<Tag>> updatedViewTags_;
  const std::shared_ptr<OperationsLoop> loop_;
  const std::shared_ptr<CSSPlatformTransitionProxy> platformTransitionProxy_;

  CSSTransitionRouting routing_;

  // shared_ptr: OperationsLoop holds strong refs. unique_ptr: this coordinator
  // is the sole owner.
  std::shared_ptr<CSSLoopTransition> loopTransition_;
  std::unique_ptr<CSSPlatformTransition> platformTransition_;
};

} // namespace reanimated::css
