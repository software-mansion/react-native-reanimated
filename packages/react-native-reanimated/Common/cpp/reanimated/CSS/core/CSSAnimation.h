#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/config/CSSAnimationConfig.h>
#include <reanimated/CSS/easing/EasingFunctions.h>
#include <reanimated/CSS/interpolation/AnimationStyleInterpolator.h>
#include <reanimated/CSS/progress/AnimationProgressProvider.h>

#include <memory>
#include <string>
#include <unordered_set>
#include <utility>

namespace reanimated {

using CSSAnimationId = std::pair<Tag, unsigned>;

class CSSAnimation {
 public:
  CSSAnimation(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode,
      unsigned index,
      const CSSAnimationConfig &config,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      double timestamp);

  CSSAnimationId getId() const {
    return {shadowNode_->getTag(), index_};
  }
  ShadowNode::Shared getShadowNode() const {
    return shadowNode_;
  }
  double getStartTimestamp(double timestamp) const {
    return progressProvider_->getStartTimestamp(timestamp);
  }
  AnimationProgressState getState(double timestamp) const {
    return progressProvider_->getState(timestamp);
  }

  bool isReversed() const;
  bool hasForwardsFillMode() const {
    return fillMode_ == AnimationFillMode::FORWARDS ||
        fillMode_ == AnimationFillMode::BOTH;
  }
  bool hasBackwardsFillMode() const {
    return fillMode_ == AnimationFillMode::BACKWARDS ||
        fillMode_ == AnimationFillMode::BOTH;
  }

  jsi::Value getViewStyle(jsi::Runtime &rt) const {
    return styleInterpolator_.getStyleValue(rt, shadowNode_);
  }
  jsi::Value getCurrentInterpolationStyle(jsi::Runtime &rt) const {
    return styleInterpolator_.getCurrentInterpolationStyle(rt, shadowNode_);
  }
  jsi::Value getBackwardsFillStyle(jsi::Runtime &rt);
  jsi::Value getForwardFillStyle(jsi::Runtime &rt);
  jsi::Value resetStyle(jsi::Runtime &rt) {
    return styleInterpolator_.reset(rt, shadowNode_);
  }

  void run(double timestamp);
  jsi::Value update(jsi::Runtime &rt, double timestamp);

  void updateSettings(
      const PartialCSSAnimationSettings &updatedSettings,
      double timestamp);

 private:
  const unsigned index_;
  const ShadowNode::Shared shadowNode_;
  AnimationFillMode fillMode_;

  std::shared_ptr<AnimationProgressProvider> progressProvider_;
  AnimationStyleInterpolator styleInterpolator_;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
