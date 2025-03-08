#pragma once

#include <reanimated/CSS/config/CSSAnimationConfig.h>
#include <reanimated/CSS/interpolation/styles/AnimationStyleInterpolator.h>
#include <reanimated/CSS/progress/animation/AnimationProgressProviderBase.h>

namespace reanimated::css {

class CSSAnimation {
 public:
  using ProgressProvider = std::shared_ptr<AnimationProgressProviderBase>;

  CSSAnimation(
      jsi::Runtime &rt,
      ShadowNode::Shared shadowNode,
      std::string name,
      const CSSKeyframesConfig &keyframesConfig,
      const AnimationFillMode fillMode,
      double timestamp);

  const std::string &getName() const;
  ShadowNode::Shared getShadowNode() const;

  bool hasForwardsFillMode() const;
  bool hasBackwardsFillMode() const;

  folly::dynamic getBackwardsFillStyle(
      const ProgressProvider &progressProvider) const;
  folly::dynamic getForwardsFillStyle(
      const ProgressProvider &progressProvider) const;
  folly::dynamic getResetStyle() const;

  void setFillMode(AnimationFillMode fillMode);

  folly::dynamic interpolate(const ProgressProvider &progressProvider) const;

 private:
  const std::string name_;
  const ShadowNode::Shared shadowNode_;
  AnimationFillMode fillMode_;

  std::shared_ptr<AnimationStyleInterpolator> styleInterpolator_;
};

} // namespace reanimated::css
