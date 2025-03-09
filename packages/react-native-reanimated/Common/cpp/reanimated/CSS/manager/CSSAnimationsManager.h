#pragma once

#include <reanimated/CSS/config/CSSAnimationConfig.h>
#include <reanimated/CSS/manager/AnimationTimeProgressProvidersManager.h>
#include <reanimated/CSS/registry/CSSAnimationsRegistry.h>
#include <reanimated/CSS/registry/CSSKeyframesRegistry.h>

namespace reanimated::css {

class CSSAnimationsManager final {
 public:
  CSSAnimationsManager(
      const std::shared_ptr<CSSAnimationsRegistry> &animationsRegistry,
      const std::shared_ptr<CSSKeyframesRegistry> &keyframesRegistry,
      const std::shared_ptr<AnimationTimeProgressProvidersManager>
          &timeProgressProvidersManager);

  bool hasUpdates() const;

  void apply(
      const ShadowNode::Shared &shadowNode,
      const CSSAnimationUpdates &updates,
      double timestamp);
  void remove(Tag viewTag);

  void flushUpdates(UpdatesBatch &updatesBatch);

 private:
  using AnimationVectorsMap = std::unordered_map<std::string, AnimationsVector>;
  using IndexToAnimationMap =
      std::unordered_map<size_t, std::shared_ptr<CSSAnimation>>;

  std::shared_ptr<CSSAnimationsRegistry> animationsRegistry_;
  std::shared_ptr<CSSKeyframesRegistry> keyframesRegistry_;
  std::shared_ptr<AnimationTimeProgressProvidersManager>
      timeProgressProvidersManager_;

  std::shared_ptr<CSSAnimation> createAnimation(
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
      const ShadowNode::Shared &shadowNode,
      const std::optional<std::vector<std::string>> &animationNames,
      const CSSAnimationSettingsMap &newAnimationSettings,
      double timestamp) const;
  AnimationVectorsMap &getViewAnimationsMap(Tag viewTag) const;
};

} // namespace reanimated::css
