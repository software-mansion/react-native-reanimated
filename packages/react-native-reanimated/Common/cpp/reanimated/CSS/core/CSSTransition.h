#pragma once

#include <reanimated/CSS/config/CSSTransitionConfig.h>
#include <reanimated/CSS/easing/utils.h>
#include <reanimated/CSS/interpolation/styles/TransitionStyleInterpolator.h>
#include <reanimated/CSS/progress/TransitionProgressProvider.h>

#include <memory>
#include <string>
#include <unordered_set>
#include <utility>

namespace reanimated::css {

class CSSTransition {
 public:
  explicit CSSTransition(const CSSTransitionConfig &config);

  double getMinDelay(double timestamp) const;
  TransitionProgressState getState() const;
  TransitionProperties getProperties() const;
  PropertyNames getAllowedProperties(
      const folly::dynamic &oldProps,
      const folly::dynamic &newProps);
  folly::dynamic getCurrentFrameProps(
      const ShadowNode::Shared &shadowNode,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) const;

  // TODO - remove this method when CSS refactor is finished
  void updateSettings(const CSSTransitionConfigUpdates &config);
  void updateConfig(const CSSTransitionConfig &config);
  void run(
      double timestamp,
      const ChangedProps &changedProps,
      const folly::dynamic &lastUpdateValue);
  void update(double timestamp);

 private:
  TransitionProperties properties_;
  CSSTransitionPropertiesSettings settings_;
  TransitionProgressProvider progressProvider_;
  TransitionStyleInterpolator styleInterpolator_;

  void updateTransitionProperties(const TransitionProperties &properties);
  bool isAllowedProperty(const std::string &propertyName) const;
};

} // namespace reanimated::css
