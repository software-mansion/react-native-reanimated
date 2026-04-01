#pragma once

#include <reanimated/CSS/configs/CSSAnimationConfig.h>
#include <reanimated/CSS/configs/CSSKeyframesConfig.h>
#include <reanimated/CSS/interpolation/styles/AnimationStyleInterpolator.h>
#include <reanimated/CSS/progress/AnimationProgressProvider.h>

#include <memory>

namespace reanimated::css {

// Drives CSS animation properties that cannot be animated natively on the
// platform. Updates are calculated and applied on each frame by reanimated.
class CSSLoopAnimation {
 public:
  static constexpr double FALLBACK_INTERPOLATION_THRESHOLD = 0.5;

  CSSLoopAnimation(
      std::shared_ptr<const ShadowNode> shadowNode,
      std::shared_ptr<AnimationStyleInterpolator> styleInterpolator,
      std::shared_ptr<AnimationProgressProvider> progressProvider,
      AnimationFillMode fillMode);

  std::shared_ptr<const ShadowNode> getShadowNode() const;
  AnimationProgressState getState(double timestamp) const;
  double getStartTimestamp(double timestamp) const;
  bool isReversed() const;

  bool hasForwardsFillMode() const;
  bool hasBackwardsFillMode() const;

  folly::dynamic getCurrentInterpolationStyle() const;
  folly::dynamic getBackwardsFillStyle() const;
  folly::dynamic getResetStyle() const;

  void run(double timestamp);
  folly::dynamic update(double timestamp);

  void pause(double timestamp);
  void play(double timestamp);
  void updateSettings(const PartialCSSAnimationSettings &settings, double timestamp);

 private:
  const std::shared_ptr<const ShadowNode> shadowNode_;
  const std::shared_ptr<AnimationStyleInterpolator> styleInterpolator_;
  const std::shared_ptr<AnimationProgressProvider> progressProvider_;
  AnimationFillMode fillMode_;
};

} // namespace reanimated::css
