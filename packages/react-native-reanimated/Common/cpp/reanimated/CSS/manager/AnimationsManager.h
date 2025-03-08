#pragma once

#include <reanimated/CSS/config/CSSAnimationConfig.h>
#include <reanimated/CSS/manager/AnimationsTimeProgressManager.h>
#include <reanimated/CSS/registry/CSSAnimationsRegistry.h>
#include <reanimated/CSS/registry/CSSKeyframesRegistry.h>

namespace reanimated::css {

class AnimationsManager final {
 public:
  AnimationsManager(
      const std::shared_ptr<CSSAnimationsRegistry> &animationsRegistry,
      const std::shared_ptr<CSSKeyframesRegistry> &keyframesRegistry,
      const std::shared_ptr<AnimationsTimeProgressManager>
          &timeProgressManager);

  void apply(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode,
      const CSSAnimationUpdates &updates,
      double timestamp);
  void remove(Tag viewTag);

 private:
  using AnimationVectorsMap = std::unordered_map<std::string, AnimationsVector>;
  using IndexToAnimationMap =
      std::unordered_map<size_t, std::shared_ptr<CSSAnimation>>;

  std::shared_ptr<CSSAnimationsRegistry> animationsRegistry_;
  std::shared_ptr<CSSKeyframesRegistry> keyframesRegistry_;
  std::shared_ptr<AnimationsTimeProgressManager> timeProgressManager_;

  std::shared_ptr<CSSAnimation> createAnimation(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode,
      const std::string &name,
      const CSSAnimationSettings &settings,
      double timestamp) const;
  std::shared_ptr<AnimationProgressProviderBase> createProgressProvider(
      const CSSAnimationSettings &settings,
      const std::shared_ptr<KeyframeEasingFunctions> &keyframeEasingFunctions,
      double timestamp) const;
  void updateAnimationSettings(
      std::shared_ptr<CSSAnimation> &animation,
      const PartialCSSAnimationSettings &settings,
      double timestamp) const;

  AnimationsVector buildAnimationsVector(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode,
      const std::optional<std::vector<std::string>> &animationNames,
      const CSSAnimationSettingsMap &newAnimationSettings,
      double timestamp) const;
  AnimationVectorsMap &getViewAnimationsMap(Tag viewTag) const;
};

} // namespace reanimated::css
