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
      const CSSAnimationConfig &config,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      double timestamp);

  CSSAnimationId getId() const;
  ShadowNode::Shared getShadowNode() const;

  double getStartTimestamp(double timestamp) const;
  AnimationProgressState getState(double timestamp) const;
  bool isReversed() const;

  bool hasForwardsFillMode() const;
  bool hasBackwardsFillMode() const;

  jsi::Value getViewStyle(jsi::Runtime &rt) const;
  jsi::Value getCurrentInterpolationStyle(jsi::Runtime &rt) const;
  jsi::Value getBackwardsFillStyle(jsi::Runtime &rt) const;
  jsi::Value getForwardsFillStyle(jsi::Runtime &rt) const;
  jsi::Value getResetStyle(jsi::Runtime &rt) const;

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
