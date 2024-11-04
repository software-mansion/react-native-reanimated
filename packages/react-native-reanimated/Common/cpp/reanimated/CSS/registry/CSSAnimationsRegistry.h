#pragma once

#include <reanimated/CSS/core/CSSAnimation.h>
#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <memory>
#include <queue>
#include <utility>

namespace reanimated {

enum class AnimationOperation { ACTIVATE, DEACTIVATE, FINISH };

class CSSAnimationsRegistry : public UpdatesRegistry {
 public:
  bool hasUpdates() const {
    return !runningAnimationIds_.empty() || !delayedAnimationIds_.empty();
  }

  void updateSettings(
      unsigned id,
      const PartialCSSAnimationSettings &updatedSettings,
      double timestamp);

  void add(
      jsi::Runtime &rt,
      const std::shared_ptr<CSSAnimation> &animation,
      double timestamp);
  void remove(unsigned id);
  void update(jsi::Runtime &rt, double timestamp);

 private:
  using Registry = std::unordered_map<unsigned, std::shared_ptr<CSSAnimation>>;
  using DelayedQueue = std::priority_queue<
      std::pair<time_t, unsigned>,
      std::vector<std::pair<time_t, unsigned>>,
      std::greater<std::pair<time_t, unsigned>>>;

  Registry registry_;

  std::unordered_set<unsigned> runningAnimationIds_;
  std::unordered_set<unsigned> delayedAnimationIds_;
  DelayedQueue delayedAnimationsQueue_;

  void activateDelayedAnimations(double timestamp);
};

} // namespace reanimated
