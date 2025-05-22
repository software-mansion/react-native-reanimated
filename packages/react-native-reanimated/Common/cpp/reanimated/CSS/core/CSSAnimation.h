#pragma once

#include <reanimated/CSS/config/CSSAnimationConfig.h>
#include <reanimated/CSS/easing/utils.h>
#include <reanimated/CSS/interpolation/styles/AnimationStyleInterpolator.h>
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
      const CSSAnimationConfig &config,
      const std::shared_ptr<CSSKeyframesRegistry> &keyframesRegistry,
      double timestamp);

  const std::string &getName() const;

  double getStartTimestamp(double timestamp) const;
  AnimationProgressState getState() const;
  bool isReversed() const;

  bool hasForwardsFillMode() const;
  bool hasBackwardsFillMode() const;

  folly::dynamic getBackwardsFillStyle() const;
  folly::dynamic getResetStyle(
      const ShadowNode::Shared &shadowNode,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) const;
  folly::dynamic getCurrentFrameProps(
      const ShadowNode::Shared &shadowNode,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) const;

  void updateSettings(
      const PartialCSSAnimationSettings &updatedSettings,
      double timestamp);
  bool updateSettings(const CSSAnimationSettings &settings, double timestamp);
  void run(double timestamp);
  void update(double timestamp);

 private:
  const std::string name_;
  AnimationFillMode fillMode_;

  std::shared_ptr<AnimationProgressProvider> progressProvider_;
  std::shared_ptr<AnimationStyleInterpolator> styleInterpolator_;

  PropertyInterpolatorUpdateContext getUpdateContext(
      const ShadowNode::Shared &shadowNode,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) const;
};

} // namespace reanimated::css
