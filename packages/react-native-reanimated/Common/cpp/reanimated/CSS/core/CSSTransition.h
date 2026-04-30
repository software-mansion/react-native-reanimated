#pragma once

#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/core/CSSLoopTransition.h>
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
      const std::shared_ptr<OperationsLoop> &loop);
  ~CSSTransition();

  Tag getViewTag() const;
  ShadowNodeFamily::Shared getFamilyShared() const;
  TransitionProperties getProperties() const;

  folly::dynamic
  run(jsi::Runtime &rt, const CSSTransitionConfig &config, const folly::dynamic &lastUpdateValue, double timestamp);
  folly::dynamic computeCurrentStyle();

 private:
  const std::shared_ptr<const ShadowNode> shadowNode_;
  const std::shared_ptr<CSSLoopTransition> loopTransition_;
};

} // namespace reanimated::css
