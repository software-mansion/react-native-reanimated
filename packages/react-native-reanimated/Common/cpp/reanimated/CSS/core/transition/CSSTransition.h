#pragma once

#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/core/transition/CSSLoopTransition.h>
#include <reanimated/CSS/core/transition/CSSPlatformTransitionProxy.h>
#include <reanimated/CSS/events/CSSEvent.h>
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
    virtual void
    onTransitionEvent(Tag viewTag, const std::string &propertyName, CSSEventType type, double elapsedTimeMs) = 0;
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

  /// Properties animating on the C++ loop. The updates registry retains only these:
  /// a platform-routed value lives natively, and a stale copy would be re-injected.
  TransitionProperties getLoopProperties() const;

  folly::dynamic takeUpdates();

  /// Applies a config: routes props between the platform and loop sides and runs them.
  folly::dynamic run(jsi::Runtime &rt, CSSTransitionConfig &&config, const folly::dynamic &lastUpdates);
  /// Runs the loop side directly from already-computed (dynamic) diffs.
  folly::dynamic run(const PropertyValueDynamicDiffsMap &propertyDiffs, const folly::dynamic &lastUpdates);
  void cancel();
  /// Drops the properties from the transition, so neither the loop nor a native animation keeps
  /// writing them once their value has been evicted from the updates registry.
  void removeProperties(const std::vector<std::string> &propertyNames, double timestamp);

  void setPseudoLockedProperties(TransitionProperties properties);

  void setEventMask(CSSEventMask eventMask);

 private:
  const std::shared_ptr<const ShadowNode> shadowNode_;
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;
  const std::shared_ptr<CSSPlatformTransitionProxy> platformTransitionProxy_;
  const std::shared_ptr<OperationsLoop> loop_;
  Observer &observer_;

  CSSTransitionRouting routing_;
  TransitionProperties pseudoLockedProperties_;
  std::shared_ptr<CSSLoopTransition> loopTransition_;

  CSSEventMask eventMask_{0};
  // What runs have settled since the last flush. An interpolator is retired by the same call that
  // produces its final frame, so a run finishing within its starting frame leaves nothing to
  // recompute afterwards. Several runs can land before one flush, so they accumulate here.
  folly::dynamic pendingInitialUpdate_ = folly::dynamic::object();

  CSSLoopTransition &ensureLoopTransition();
  void dropPending(const std::vector<std::string> &propertyNames);
  void scheduleLoop(double timestamp);
  void observeMilestones(CSSLoopTransition &loopTransition);
  void reportMilestone(RunMilestone milestone, const std::string &propertyName, double elapsedTime);
  void emitEvent(CSSEventType type, const std::string &propertyName, double elapsedTime) const;
};

} // namespace reanimated::css
