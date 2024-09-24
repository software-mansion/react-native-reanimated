#pragma once

#include <reanimated/CSS/easing/EasingFunctions.h>

#include <reanimated/CSS/CSSAnimation.h>

#include <react/renderer/core/ShadowNode.h>

#include <memory>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

namespace reanimated {

using UpdatesBatch =
    std::vector<std::pair<ShadowNode::Shared, std::unique_ptr<jsi::Value>>>;

using AnimationsRegistry =
    std::unordered_map<unsigned, std::shared_ptr<CSSAnimation>>;

class CSSRegistry {
 public:
  bool hasActiveAnimations() const;

  bool isCssLoopRunning() const;

  void setCssLoopRunning(const bool running);

  void add(
      jsi::Runtime &rt,
      const unsigned id,
      const std::shared_ptr<CSSAnimation> &animation,
      const jsi::Value &viewStyle);

  void remove(const unsigned id, const bool revertChanges);

  void updateConfig(
      jsi::Runtime &rt,
      const unsigned id,
      const jsi::Value &settings,
      const jsi::Value &viewStyle);

  UpdatesBatch update(jsi::Runtime &rt, const double timestamp);

 private:
  // Registry containing all animations (both active and inactive)
  AnimationsRegistry registry_;

  // Set of active animation IDs. These are animations that are either pending,
  // running, or in intermediate states like finishing/reverting.
  std::unordered_set<unsigned> activeAnimationIds_;

  // Set of inactive animation IDs. These are animations that are either paused
  // or finished (but not reverted). Inactive animations do not participate in
  // the update loop.
  std::unordered_set<unsigned> inactiveAnimationIds_;

  bool cssLoopRunning_ = false;

  void activateAnimation(const unsigned id);
  void deactivateAnimation(const unsigned id);
  void removeAnimation(const unsigned id);
};

} // namespace reanimated
