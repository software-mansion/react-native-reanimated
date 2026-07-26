#pragma once

#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/interpolation/styles/TransitionStyleInterpolator.h>
#include <reanimated/CSS/progress/TransitionProgressProvider.h>
#include <reanimated/Fabric/updates/OperationsLoop.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <functional>
#include <memory>
#include <string>
#include <vector>

namespace reanimated::css {

class CSSLoopTransition : public OperationsLoop::LoopOperation, public std::enable_shared_from_this<CSSLoopTransition> {
 public:
  using OnUpdateCallback = std::function<void(Tag)>;

  CSSLoopTransition(
      Tag viewTag,
      const std::string &componentName,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      OnUpdateCallback onUpdate);

  double getMinDelay(double timestamp) const;

  bool update(double timestamp, OperationsLoop &loop) override;

  folly::dynamic run(
      jsi::Runtime &rt,
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const PropertyValueDiffsMap &propertiesDiffs,
      const folly::dynamic &lastUpdateValue,
      double timestamp);
  /** TODO: unify folly::dynamic and jsi::value versions */
  folly::dynamic run(
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const PropertyValueDynamicDiffsMap &propertiesDiffs,
      const folly::dynamic &lastUpdateValue,
      double timestamp);
  void updateSettings(
      const PropertiesSettingsMap &changedPropertiesSettings,
      const std::vector<std::string> &removedProperties);

  folly::dynamic computeCurrentStyle(const std::shared_ptr<const ShadowNode> &shadowNode);

 private:
  const Tag viewTag_;
  const std::string componentName_;
  OnUpdateCallback onUpdate_;

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
