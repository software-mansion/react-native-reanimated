#pragma once

#include <reanimated/CSS/config/CSSTransitionConfig.h>
#include <reanimated/CSS/easing/EasingFunctions.h>
#include <reanimated/CSS/interpolation/TransitionStyleInterpolator.h>
#include <reanimated/CSS/progress/TransitionProgressProvider.h>

namespace reanimated {

class CSSTransition {
 public:
  CSSTransition(
      const ShadowNode::Shared &shadowNode,
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
  double getMinDelay(double timestamp) const {
    return progressProvider_.getMinDelay(timestamp);
  }
  TransitionProgressState getState() const {
    return progressProvider_.getState();
  }
  jsi::Value getCurrentInterpolationStyle(jsi::Runtime &rt) const {
    return styleInterpolator_.getCurrentInterpolationStyle(rt, shadowNode_);
  }

  void updateSettings(const PartialCSSTransitionSettings &settings);

  jsi::Value
  run(jsi::Runtime &rt, const ChangedProps &changedProps, double timestamp);
  jsi::Value update(jsi::Runtime &rt, double timestamp);

 private:
  const ShadowNode::Shared shadowNode_;
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;

  TransitionStyleInterpolator styleInterpolator_;
  TransitionProgressProvider progressProvider_;

  TransitionProperties properties_;

  void updateTransitionProperties(const TransitionProperties &properties);
};

} // namespace reanimated
