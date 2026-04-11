#pragma once

#include <reanimated/CSS/configs/CSSAnimationConfig.h>
#include <reanimated/CSS/configs/CSSKeyframesConfig.h>
#include <reanimated/CSS/progress/AnimationProgressProvider.h>
#include <reanimated/Fabric/updates/LoopOperation.h>

#include <memory>
#include <string>

namespace reanimated::css {

class CSSAnimation : public LoopOperation {
 public:
  static constexpr double FALLBACK_INTERPOLATION_THRESHOLD = 0.5;

  CSSAnimation(
      std::string animationName,
      const CSSKeyframesConfig &cssKeyframesConfig,
      const CSSAnimationSettings &settings,
      double timestamp);

  void onUpdate(double timestamp) override;
  bool isRunning() const override;

  const std::string &getName() const;

  double getStartTimestamp(double timestamp) const;
  double getRemainingDelay(double timestamp) const;
  AnimationProgressState getState() const;

  bool isReversed() const;
  bool hasForwardsFillMode() const;
  bool hasBackwardsFillMode() const;

  folly::dynamic getBackwardsFillStyle() const;
  folly::dynamic getCurrentInterpolationStyle(const std::shared_ptr<const ShadowNode> &shadowNode) const;
  folly::dynamic getResetStyle(const std::shared_ptr<const ShadowNode> &shadowNode) const;

  void updateSettings(const PartialCSSAnimationSettings &updatedSettings, double timestamp);

 private:
  const std::string name_;
  AnimationFillMode fillMode_;

  const std::shared_ptr<AnimationStyleInterpolator> styleInterpolator_;
  const std::shared_ptr<AnimationProgressProvider> progressProvider_;
};

} // namespace reanimated::css
