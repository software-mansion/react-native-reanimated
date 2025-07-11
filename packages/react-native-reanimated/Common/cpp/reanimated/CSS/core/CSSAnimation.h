#pragma once

#include <reanimated/CSS/config/CSSAnimationConfig.h>
#include <reanimated/CSS/progress/AnimationProgressProvider.h>
#include <reanimated/CSS/registry/CSSKeyframesRegistry.h>

#include <memory>
#include <string>
#include <unordered_set>
#include <utility>

namespace reanimated::css {

class CSSAnimation {
 public:
  CSSAnimation(
      jsi::Runtime &rt,
      ShadowNode::Shared shadowNode,
      std::string animationName,
      const std::shared_ptr<CSSKeyframesRegistry> &cssKeyframesRegistry,
      const CSSAnimationSettings &settings,
      double timestamp);

  const std::string &getName() const;
  ShadowNode::Shared getShadowNode() const;

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
  const ShadowNode::Shared shadowNode_;
  AnimationFillMode fillMode_;

  const std::shared_ptr<AnimationStyleInterpolator> styleInterpolator_;
  const std::shared_ptr<AnimationProgressProvider> progressProvider_;
};

} // namespace reanimated::css
