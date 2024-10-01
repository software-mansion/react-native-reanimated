#pragma once

#include <reanimated/CSS/easing/EasingFunctions.h>

#include <reanimated/CSS/CSSAnimation.h>
#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <memory>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

namespace reanimated {

using AnimationsRegistry =
    std::unordered_map<unsigned, std::shared_ptr<CSSAnimation>>;

class CSSAnimationsRegistry : public UpdatesRegistry {
 public:
  bool hasRunningAnimations() const;

  void add(const unsigned id, const std::shared_ptr<CSSAnimation> &animation);
  void remove(const unsigned id);
  void
  updateConfig(jsi::Runtime &rt, const unsigned id, const jsi::Value &settings);
  void update(jsi::Runtime &rt, const double timestamp);

 private:
  AnimationsRegistry animationsRegistry_;

  // Set of active animation IDs. These are animations that are either pending,
  // running, or in intermediate states like finishing/reverting.
  std::unordered_set<unsigned> activeAnimationIds_;

  // Set of inactive animation IDs. These are animations that are either paused
  // or finished (but not reverted). Inactive animations do not participate in
  // the update loop.
  std::unordered_set<unsigned> inactiveAnimationIds_;

  void activateAnimation(const unsigned id);
  void deactivateAnimation(const unsigned id);
  void removeAnimation(const unsigned id);
};

} // namespace reanimated
