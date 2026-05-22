#pragma once

#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/core/transition/CSSPlatformTransition.h>
#include <reanimated/CSS/core/transition/CSSPlatformTransitionProxy.h>
#include <reanimated/CSS/easing/EasingFunctions.h>
#include <reanimated/CSS/misc/ViewStylesRepository.h>
#include <reanimated/CSS/progress/TransitionProgressProvider.h>
#include <reanimated/Fabric/updates/OperationsLoop.h>

#include <react/renderer/core/ShadowNode.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <memory>
#include <string>
#include <vector>

namespace reanimated::css {

class CSSLoopTransition;

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
      Observer &observer,
      const std::shared_ptr<CSSPlatformTransitionProxy> &platformTransitionProxy);
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
  double getMinDelay(double timestamp) const;
  TransitionProgressState getState() const;

  void schedule(OperationsLoop &loop);
  void unschedule(OperationsLoop &loop);

  folly::dynamic
  run(jsi::Runtime &rt, CSSTransitionConfig &&config, const folly::dynamic &lastUpdateValue, double timestamp);
  /** Dynamic-typed run used by `PseudoStylesRegistry`: bypasses platform
   * routing - pseudo-driven transitions always stay on the loop side. */
  folly::dynamic
  run(const PropertyValueDynamicDiffsMap &propertiesDiffs, const folly::dynamic &lastUpdateValue, double timestamp);
  void updateSettings(
      const PropertiesTimingSettingsMap &changedPropertiesSettings,
      const std::vector<std::string> &removedProperties);

  folly::dynamic computeCurrentStyle();

 private:
  folly::dynamic
  runLoop(jsi::Runtime &rt, const CSSTransitionConfig &config, const folly::dynamic &lastUpdates, double timestamp);
  folly::dynamic runPlatform(const CSSPlatformTransitionConfig &config);

  const std::shared_ptr<const ShadowNode> shadowNode_;
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;
  Observer &observer_;
  const std::shared_ptr<CSSPlatformTransitionProxy> platformTransitionProxy_;

  CSSTransitionRouting routing_;

  // Lazily created so a transition that never routes to a side doesn't pay for
  // the allocation. shared_ptr on the loop side because OperationsLoop holds
  // strong refs while a frame is scheduled.
  std::shared_ptr<CSSLoopTransition> loopTransition_;
  std::unique_ptr<CSSPlatformTransition> platformTransition_;
};

} // namespace reanimated::css
