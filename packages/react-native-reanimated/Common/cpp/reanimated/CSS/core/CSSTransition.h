#pragma once

#include <reanimated/CSS/config/CSSTransitionConfig.h>
#include <reanimated/CSS/easing/EasingFunctions.h>
#include <reanimated/CSS/interpolation/TransitionStyleInterpolator.h>
#include <reanimated/CSS/progress/TransitionProgressProvider.h>

namespace reanimated {

class CSSTransition {
 public:
  using PartialSettings = PartialCSSTransitionSettings;

  CSSTransition(
      const ShadowNode::Shared shadowNode,
      const CSSTransitionConfig &config,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

  Tag getViewTag() const {
    return shadowNode_->getTag();
  }
  ShadowNode::Shared getShadowNode() const {
    return shadowNode_;
  }
  const TransitionProperties &getProperties() const {
    return properties_;
  }
  double getMinDelay(const time_t timestamp) const {
    return progressProvider_.getMinDelay(timestamp);
  }
  TransitionProgressState getState(const time_t timestamp) const {
    return progressProvider_.getState();
  }
  jsi::Value getCurrentInterpolationStyle(jsi::Runtime &rt) const {
    return styleInterpolator_.getCurrentInterpolationStyle(rt, shadowNode_);
  }

  void updateSettings(
      jsi::Runtime &rt,
      const PartialCSSTransitionSettings &settings);

  jsi::Value run(
      jsi::Runtime &rt,
      const ChangedProps &changedProps,
      const time_t timestamp);
  jsi::Value update(jsi::Runtime &rt, time_t timestamp);

 private:
  const ShadowNode::Shared shadowNode_;
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;

  TransitionStyleInterpolator styleInterpolator_;
  TransitionProgressProvider progressProvider_;

  TransitionProperties properties_;

  void updateTransitionProperties(const TransitionProperties &properties);
};

} // namespace reanimated
