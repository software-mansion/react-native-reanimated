#pragma once

#include <reanimated/CSS/config/CSSAnimationConfig.h>
#include <reanimated/CSS/easing/EasingFunctions.h>
#include <reanimated/CSS/interpolation/styles/AnimationStyleInterpolator.h>
#include <reanimated/CSS/progress/AnimationProgressProvider.h>

#include <memory>
#include <string>
#include <unordered_set>
#include <utility>

namespace reanimated::css {

class CSSAnimation {
 public:
  CSSAnimation(
      jsi::Runtime &rt,
      std::shared_ptr<const ShadowNode> shadowNode,
      std::string name,
      const CSSKeyframesConfig &keyframesConfig,
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

  std::shared_ptr<AnimationProgressProvider> progressProvider_;
  std::shared_ptr<AnimationStyleInterpolator> styleInterpolator_;
};

} // namespace reanimated::css
