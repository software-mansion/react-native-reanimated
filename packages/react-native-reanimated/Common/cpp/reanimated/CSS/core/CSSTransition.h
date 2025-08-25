#pragma once

#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/easing/EasingFunctions.h>
#include <reanimated/CSS/interpolation/styles/TransitionStyleInterpolator.h>
#include <reanimated/CSS/progress/TransitionProgressProvider.h>

#include <memory>
#include <string>
#include <unordered_set>
#include <utility>

namespace reanimated::css {

class CSSTransition {
 public:
  CSSTransition(
      std::shared_ptr<const ShadowNode> shadowNode,
      const CSSTransitionConfig &config,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

  Tag getViewTag() const;
  std::shared_ptr<const ShadowNode> getShadowNode() const;
  double getMinDelay(double timestamp) const;
  TransitionProgressState getState() const;
  folly::dynamic getCurrentInterpolationStyle() const;
  TransitionProperties getProperties() const;
  PropertyNames getAllowedProperties(
      const folly::dynamic &oldProps,
      const folly::dynamic &newProps);

  void updateSettings(const PartialCSSTransitionConfig &config);
  folly::dynamic run(
      const ChangedProps &changedProps,
      const folly::dynamic &lastUpdateValue,
      double timestamp);
  folly::dynamic update(double timestamp);

 private:
  const std::shared_ptr<const ShadowNode> shadowNode_;
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;
  TransitionProperties properties_;
  CSSTransitionPropertiesSettings settings_;
  TransitionStyleInterpolator styleInterpolator_;
  TransitionProgressProvider progressProvider_;

  void updateTransitionProperties(const TransitionProperties &properties);
  bool isAllowedProperty(const std::string &propertyName) const;
};

} // namespace reanimated::css
