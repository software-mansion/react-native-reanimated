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

  folly::dynamic run(
      jsi::Runtime &rt,
      const PropertyValueDiffsMap &propertiesDiffs,
      const folly::dynamic &lastUpdateValue,
      double timestamp);
  /** TODO: unify folly::dynamic and jsi::value versions */
  folly::dynamic
  run(const PropertyValueDynamicDiffsMap &propertiesDiffs, const folly::dynamic &lastUpdateValue, double timestamp);
  void updateSettings(
      const PropertiesSettingsMap &changedPropertiesSettings,
      const std::vector<std::string> &removedProperties);

  // Splits the incoming config via the platform proxy, applies the platform-side
  // entries directly, and returns the loop-side config (settings + value diffs)
  // for the caller to feed into updateSettings / run.
  CSSTransitionConfig splitForPlatformRouting(jsi::Runtime &rt, CSSTransitionConfig &&config, double timestamp);

  folly::dynamic computeCurrentStyle();

 private:
  const std::shared_ptr<const ShadowNode> shadowNode_;
  const std::shared_ptr<CSSLoopTransition> loopTransition_;
  const std::shared_ptr<CSSPlatformTransitionProxy> platformTransitionProxy_;

  CSSTransitionRouting routing_;
  std::unique_ptr<CSSPlatformTransition> platformTransition_;

  CSSPlatformTransition &ensurePlatformTransition();
};

} // namespace reanimated::css
