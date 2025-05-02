#pragma once

#include <reanimated/CSS/config/CSSTransitionConfig.h>
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
      const ShadowNode::Shared shadowNode,
      const CSSTransitionConfig &config);

  Tag getViewTag() const;
  ShadowNode::Shared getShadowNode() const;
  double getMinDelay(double timestamp) const;
  TransitionProgressState getState() const;
  TransitionProperties getProperties() const;
  PropertyNames getAllowedProperties(
      const folly::dynamic &oldProps,
      const folly::dynamic &newProps);
  folly::dynamic getCurrentFrameProps(
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) const;

  void updateSettings(const PartialCSSTransitionConfig &config);
  void run(
      double timestamp,
      const ChangedProps &changedProps,
      const folly::dynamic &lastUpdateValue);
  void update(double timestamp);

 private:
  const ShadowNode::Shared shadowNode_;
  TransitionProperties properties_;
  CSSTransitionPropertiesSettings settings_;
  TransitionProgressProvider progressProvider_;
  TransitionStyleInterpolator styleInterpolator_;

  void updateTransitionProperties(const TransitionProperties &properties);
  bool isAllowedProperty(const std::string &propertyName) const;
};

} // namespace reanimated::css
