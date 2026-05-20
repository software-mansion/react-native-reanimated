#pragma once

#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/easing/EasingFunctions.h>
#include <reanimated/CSS/interpolation/styles/TransitionStyleInterpolator.h>
#include <reanimated/CSS/progress/TransitionProgressProvider.h>
#include <reanimated/Fabric/updates/LoopOperation.h>
#include <reanimated/Fabric/updates/OperationsLoop.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <memory>
#include <string>
#include <unordered_set>
#include <vector>

namespace reanimated::css {

class CSSTransition : public LoopOperation, public std::enable_shared_from_this<CSSTransition> {
 public:
  CSSTransition(
      std::shared_ptr<const ShadowNode> shadowNode,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const std::shared_ptr<std::unordered_set<Tag>> &updatedViewTags,
      const std::shared_ptr<OperationsLoop> &loop);

  bool update(double timestamp) override;

  Tag getViewTag() const;
  std::shared_ptr<const ShadowNode> getShadowNode() const;
  ShadowNodeFamily::Shared getShadowNodeFamily() const;
  double getMinDelay(double timestamp) const;
  TransitionProgressState getState() const;
  TransitionProperties getProperties() const;

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
  // (from PR — useful for inspecting the transition state outside the frame loop.)
  folly::dynamic computeCurrentStyle();

 private:
  const std::shared_ptr<const ShadowNode> shadowNode_;
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;
  const std::shared_ptr<std::unordered_set<Tag>> updatedViewTags_;
  const std::shared_ptr<OperationsLoop> loop_;

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
