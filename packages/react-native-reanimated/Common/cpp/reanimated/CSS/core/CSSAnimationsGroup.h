#pragma once

#include <reanimated/CSS/configs/CSSAnimationConfig.h>
#include <reanimated/CSS/core/CSSAnimation.h>

#include <folly/dynamic.h>
#include <react/renderer/core/ShadowNode.h>

#include <memory>
#include <vector>

namespace reanimated::css {

using CSSAnimationsVector = std::vector<std::shared_ptr<CSSAnimation>>;

class CSSAnimationsGroup {
 public:
  CSSAnimationsGroup(std::shared_ptr<const ShadowNode> shadowNode, CSSAnimationsVector animations);

  const CSSAnimationsVector &getAnimations() const;
  ShadowNodeFamily::Shared getShadowNodeFamily() const;

  void schedule(OperationsLoop &loop);
  void unschedule(OperationsLoop &loop) const;
  void updateSettings(const CSSAnimationSettingsUpdatesMap &settingsUpdates, double timestamp);
  // Computes the combined style from all animations.
  // When includeResetStyles is true, finished animations without forwards fill
  // contribute their original (pre-animation) property values — these should be
  // committed once to revert the visual changes applied by the animation.
  folly::dynamic computeStyle(bool includeResetStyles = false) const;

 private:
  std::shared_ptr<const ShadowNode> shadowNode_;
  CSSAnimationsVector animations_;
};

} // namespace reanimated::css
