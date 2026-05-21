#pragma once

#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/easing/EasingFunctions.h>
#include <reanimated/CSS/interpolation/styles/TransitionStyleInterpolator.h>
#include <reanimated/CSS/progress/TransitionProgressProvider.h>
#include <reanimated/Fabric/updates/OperationsLoop.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <memory>
#include <string>
#include <vector>

namespace reanimated::css {

class CSSTransition : public OperationsLoop::LoopOperation, public std::enable_shared_from_this<CSSTransition> {
 public:
  class Observer {
   public:
    virtual ~Observer() = default;
    virtual void onTransitionUpdate(Tag viewTag) = 0;
  };

  CSSTransition(
      std::shared_ptr<const ShadowNode> shadowNode,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      Observer &observer);

  Tag getViewTag() const {
    return shadowNode_->getTag();
  }

  std::shared_ptr<const ShadowNode> getShadowNode() const {
    return shadowNode_;
  }

  ShadowNodeFamily::Shared getShadowNodeFamily() const {
    return shadowNode_->getFamilyShared();
  }

  TransitionProperties getProperties() const {
    return transitionProperties_;
  }

  double getMinDelay(double timestamp) const;
  TransitionProgressState getState() const;

  bool update(double timestamp, OperationsLoop &loop) override;

  folly::dynamic run(
      jsi::Runtime &rt,
      const PropertyValueDiffsMap &propertiesDiffs,
      const folly::dynamic &lastUpdateValue,
      double timestamp);
  /** TODO: unify folly::dynamic and jsi::value versions */
  folly::dynamic
  run(const PropertyValueDynamicDiffsMap &propertiesDiffs, const folly::dynamic &lastUpdateValue, double timestamp);
  void updateConfig(
      const PropertiesSettingsMap &changedPropertiesSettings,
      const std::vector<std::string> &removedProperties);

  // Compute the current interpolated style without ticking the loop forward.
  folly::dynamic computeCurrentStyle();

 private:
  const std::shared_ptr<const ShadowNode> shadowNode_;
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;

  Observer &observer_;

  TransitionProperties transitionProperties_;
  TransitionStyleInterpolator styleInterpolator_;
  TransitionProgressProvider progressProvider_;

  void handleChangedProperties(
      jsi::Runtime &rt,
      const PropertyValueDiffsMap &propertiesDiffs,
      const folly::dynamic &lastUpdateValue,
      double timestamp);
  /** TODO: unify folly::dynamic and jsi::value versions */
  void handleChangedProperties(
      const PropertyValueDynamicDiffsMap &propertiesDiffs,
      const folly::dynamic &lastUpdateValue,
      double timestamp);
  void removeProperties(const std::vector<std::string> &propertyNames);
  void removeProperty(const std::string &propertyName);
};

} // namespace reanimated::css
