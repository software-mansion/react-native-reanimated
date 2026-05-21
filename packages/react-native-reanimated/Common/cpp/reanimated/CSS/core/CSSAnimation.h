#pragma once

#include <reanimated/CSS/configs/CSSAnimationConfig.h>
#include <reanimated/CSS/configs/CSSKeyframesConfig.h>
#include <reanimated/CSS/progress/AnimationProgressProvider.h>
#include <reanimated/Fabric/updates/OperationsLoop.h>

#include <memory>
#include <string>

namespace reanimated::css {

class CSSAnimation : public OperationsLoop::LoopOperation, public std::enable_shared_from_this<CSSAnimation> {
 public:
  static constexpr double FALLBACK_INTERPOLATION_THRESHOLD = 0.5;

  class Observer {
   public:
    virtual ~Observer() = default;
    virtual void onAnimationUpdate(Tag viewTag) = 0;
    // Called when the animation finishes without `forwards` fill mode and will
    // need to be reverted to the underlying style on the next flush.
    virtual void onAnimationNeedsRevert(Tag viewTag) = 0;
  };

  CSSAnimation(
      Tag viewTag,
      std::string animationName,
      const CSSKeyframesConfig &cssKeyframesConfig,
      const CSSAnimationSettings &settings,
      Observer &observer,
      double timestamp);

  const std::string &getName() const {
    return name_;
  }

  double getStartTimestamp(double timestamp) const {
    return progressProvider_->getStartTimestamp(timestamp);
  }

  AnimationProgressState getState() const {
    return progressProvider_->getState();
  }

  bool hasForwardsFillMode() const {
    return fillMode_ == AnimationFillMode::Forwards || fillMode_ == AnimationFillMode::Both;
  }

  bool hasBackwardsFillMode() const {
    return fillMode_ == AnimationFillMode::Backwards || fillMode_ == AnimationFillMode::Both;
  }

  bool isReversed() const;

  folly::dynamic getBackwardsFillStyle() const;
  folly::dynamic getCurrentInterpolationStyle(const std::shared_ptr<const ShadowNode> &shadowNode) const;
  folly::dynamic getResetStyle(const std::shared_ptr<const ShadowNode> &shadowNode) const;

  bool update(double timestamp, OperationsLoop &loop) override;

  void schedule(OperationsLoop &loop);
  void unschedule(OperationsLoop &loop);

  void updateConfig(const PartialCSSAnimationSettings &updatedSettings, double timestamp);

 private:
  const Tag viewTag_;
  const std::string name_;
  AnimationFillMode fillMode_;

  Observer &observer_;

  const std::shared_ptr<AnimationStyleInterpolator> styleInterpolator_;
  const std::shared_ptr<AnimationProgressProvider> progressProvider_;
};

} // namespace reanimated::css
