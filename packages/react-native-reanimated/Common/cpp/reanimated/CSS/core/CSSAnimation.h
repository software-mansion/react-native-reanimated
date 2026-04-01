#pragma once

#include <reanimated/CSS/configs/CSSAnimationConfig.h>
#include <reanimated/CSS/configs/CSSKeyframesConfig.h>
#include <reanimated/CSS/core/CSSLoopAnimation.h>
#include <reanimated/CSS/platform/CSSPlatformAnimation.h>

#include <memory>
#include <string>

namespace reanimated::css {

class CSSAnimation {
 public:
  CSSAnimation(
      std::string name,
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const CSSKeyframesConfig &keyframesConfig,
      const CSSAnimationSettings &settings,
      double timestamp);

  const std::string &getName() const;
  const CSSAnimationSettings &getSettings() const;
  std::shared_ptr<const ShadowNode> getShadowNode() const;

  bool isPaused() const;
  bool hasLoopAnimation() const;

  const std::shared_ptr<CSSLoopAnimation> &getLoopAnimation() const;
  const std::shared_ptr<CSSPlatformAnimation> &getPlatformAnimation() const;

  void updateSettings(const PartialCSSAnimationSettings &updates, double timestamp);

 private:
  std::string name_;
  CSSAnimationSettings settings_;
  std::shared_ptr<const ShadowNode> shadowNode_;
  std::shared_ptr<CSSLoopAnimation> loopAnimation_;
  std::shared_ptr<CSSPlatformAnimation> platformAnimation_;
};

} // namespace reanimated::css
