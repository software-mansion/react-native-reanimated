#pragma once

#include <reanimated/CSS/configs/CSSAnimationConfig.h>
#include <reanimated/CSS/configs/CSSKeyframesConfig.h>
#include <reanimated/CSS/progress/AnimationProgressProvider.h>

#include <memory>
#include <string>

namespace reanimated::css {

class CSSAnimation {
 public:
  CSSAnimation(
      jsi::Runtime &rt,
      std::shared_ptr<const ShadowNode> shadowNode,
      std::string animationName,
      const CSSKeyframesConfig &cssKeyframesConfig,
      const CSSAnimationSettings &settings,
      double timestamp);

  const std::string &getName() const;
  std::shared_ptr<const ShadowNode> getShadowNode() const;

  double getStartTimestamp(double timestamp) const;
  AnimationProgressState getState(double timestamp) const;
  bool isReversed() const;

  bool hasForwardsFillMode() const;
  bool hasBackwardsFillMode() const;

  folly::dynamic getCurrentInterpolationStyle() const;
  folly::dynamic getBackwardsFillStyle() const;
  folly::dynamic getResetStyle() const;

  void run(double timestamp);
  folly::dynamic update(double timestamp);
  void updateSettings(
      const PartialCSSAnimationSettings &updatedSettings,
      double timestamp);

 private:
  const std::string name_;
  const std::shared_ptr<const ShadowNode> shadowNode_;
  AnimationFillMode fillMode_;

  const std::shared_ptr<AnimationStyleInterpolator> styleInterpolator_;
  const std::shared_ptr<AnimationProgressProvider> progressProvider_;
};

} // namespace reanimated::css
