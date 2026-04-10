#pragma once

#include <reanimated/CSS/configs/CSSAnimationConfig.h>
#include <reanimated/CSS/interpolation/styles/AnimationStyleInterpolator.h>
#include <reanimated/CSS/progress/AnimationProgressProvider.h>

#include <memory>
#include <unordered_set>

namespace reanimated::css {

class CSSLoopAnimation {
 public:
  static constexpr double FALLBACK_INTERPOLATION_THRESHOLD = 0.5;

  CSSLoopAnimation(
      const std::shared_ptr<AnimationStyleInterpolator> &interpolator,
      const std::unordered_set<std::string> &allProperties,
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const std::shared_ptr<CSSAnimationSettings> &settings,
      const std::shared_ptr<KeyframeEasingConfigs> &keyframeEasingConfigs,
      double timestamp);

  double getStartTimestamp(double timestamp) const;
  AnimationProgressState getState(double timestamp) const;

  folly::dynamic getCurrentInterpolationStyle() const;
  folly::dynamic getBackwardsFillStyle() const;
  folly::dynamic getResetStyle() const;

  void setAnimatedProperties(const std::unordered_set<std::string> &loopDrivenProperties);
  void updateSettings(const PartialCSSAnimationSettings &updatedSettings, double timestamp);
  folly::dynamic update(double timestamp);

 private:
  bool isReversed() const;

  const std::shared_ptr<CSSAnimationSettings> settings_;
  const std::shared_ptr<const ShadowNode> shadowNode_;
  const std::shared_ptr<AnimationProgressProvider> progressProvider_;
  const std::shared_ptr<AnimationStyleInterpolator> interpolator_;

  const std::unordered_set<std::string> allProperties_;
};

} // namespace reanimated::css
