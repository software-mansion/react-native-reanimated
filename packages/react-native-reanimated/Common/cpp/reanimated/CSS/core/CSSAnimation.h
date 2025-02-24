#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/config/CSSAnimationConfig.h>
#include <reanimated/CSS/easing/EasingFunctions.h>
#include <reanimated/CSS/interpolation/styles/AnimationStyleInterpolator.h>
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
      ShadowNode::Shared shadowNode,
      unsigned index,
      const CSSKeyframesConfig &keyframesConfig,
      const CSSAnimationSettings &settings,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      double timestamp);

  CSSAnimationId getId() const;
  ShadowNode::Shared getShadowNode() const;

  double getStartTimestamp(double timestamp) const;
  AnimationProgressState getState(double timestamp) const;
  bool isReversed() const;

  bool hasForwardsFillMode() const;
  bool hasBackwardsFillMode() const;

  folly::dynamic getCurrentInterpolationStyle() const;
  folly::dynamic getBackwardsFillStyle() const;
  folly::dynamic getForwardsFillStyle() const;
  folly::dynamic getResetStyle() const;

  void run(double timestamp);
  folly::dynamic update(double timestamp);
  void updateSettings(
      const PartialCSSAnimationSettings &updatedSettings,
      double timestamp);

 private:
  const unsigned index_;
  const ShadowNode::Shared shadowNode_;
  AnimationFillMode fillMode_;

  std::shared_ptr<AnimationProgressProvider> progressProvider_;
  std::shared_ptr<AnimationStyleInterpolator> styleInterpolator_;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
