#pragma once

#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/core/transition/CSSTransition.h>
#include <reanimated/CSS/interpolation/styles/TransitionStyleInterpolator.h>
#include <reanimated/CSS/progress/TransitionProgressProvider.h>
#include <reanimated/Fabric/updates/OperationsLoop.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <memory>
#include <string>
#include <vector>

namespace reanimated::css {

class CSSLoopTransition : public OperationsLoop::LoopOperation, public std::enable_shared_from_this<CSSLoopTransition> {
 public:
  CSSLoopTransition(
      Tag viewTag,
      const std::string &componentName,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      CSSTransition::Observer &observer);

  TransitionProperties getProperties() const {
    return properties_;
  }

  double getMinDelay(double timestamp) const;
  TransitionProgressState getState() const;

  bool update(double timestamp, OperationsLoop &loop) override;

  folly::dynamic run(
      jsi::Runtime &rt,
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const CSSTransitionConfig &config,
      const folly::dynamic &lastUpdateValue,
      double timestamp);
  /** Dynamic-typed path used by `PseudoStylesRegistry`: settings have already
   * been seeded via `updateSettings`, only value diffs come through here. */
  folly::dynamic run(
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const PropertyValueDynamicDiffsMap &propertiesDiffs,
      const folly::dynamic &lastUpdateValue,
      double timestamp);
  void updateSettings(
      const PropertiesTimingSettingsMap &changedPropertiesSettings,
      const std::vector<std::string> &removedProperties);

  folly::dynamic computeCurrentStyle(const std::shared_ptr<const ShadowNode> &shadowNode);

 private:
  const Tag viewTag_;
  const std::string componentName_;
  CSSTransition::Observer &observer_;

  TransitionProperties properties_;
  TransitionStyleInterpolator styleInterpolator_;
  TransitionProgressProvider progressProvider_;

  void runProperty(
      jsi::Runtime &rt,
      const std::string &propertyName,
      const CSSTransitionPropertySettings &propertySettings,
      const folly::dynamic &lastUpdateValue,
      double timestamp);
  void runPropertyDynamic(
      const std::string &propertyName,
      const PropertyValueDynamicDiff &propertyDiff,
      const folly::dynamic &lastUpdateValue,
      double timestamp);
  void removeProperty(const std::string &propertyName);
};

} // namespace reanimated::css
