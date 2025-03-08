#pragma once

#include <reanimated/CSS/config/CSSAnimationConfig.h>
#include <reanimated/CSS/interpolation/styles/AnimationStyleInterpolator.h>
#include <reanimated/CSS/progress/animation/AnimationProgressProviderBase.h>

namespace reanimated::css {

class CSSAnimation {
 public:
  CSSAnimation(
      std::string name,
      ShadowNode::Shared shadowNode,
      AnimationFillMode fillMode,
      const std::shared_ptr<AnimationStyleInterpolator> &styleInterpolator,
      const std::shared_ptr<AnimationProgressProviderBase> &progressProvider);

  const std::string &getName() const;
  ShadowNode::Shared getShadowNode() const;
  std::shared_ptr<AnimationProgressProviderBase> getProgressProvider() const;

  bool isReversed() const;
  bool hasForwardsFillMode() const;
  bool hasBackwardsFillMode() const;

  folly::dynamic getBackwardsFillStyle() const;
  folly::dynamic getForwardsFillStyle() const;
  folly::dynamic getResetStyle() const;

  void setFillMode(AnimationFillMode fillMode);
  void setProgressProvider(
      const std::shared_ptr<AnimationProgressProviderBase> &progressProvider);

  folly::dynamic getCurrentFrame() const;

 private:
  const std::string name_;
  const ShadowNode::Shared shadowNode_;
  AnimationFillMode fillMode_;

  std::shared_ptr<AnimationStyleInterpolator> styleInterpolator_;
  std::shared_ptr<AnimationProgressProviderBase> progressProvider_;
};

using AnimationsVector = std::vector<std::shared_ptr<CSSAnimation>>;

} // namespace reanimated::css
