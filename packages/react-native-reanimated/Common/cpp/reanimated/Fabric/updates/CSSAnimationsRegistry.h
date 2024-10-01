#pragma once

#include <reanimated/CSS/easing/EasingFunctions.h>

#include <reanimated/CSS/CSSAnimation.h>
#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <memory>
#include <queue>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

namespace reanimated {

enum class AnimationOperation { ADD, REMOVE, ACTIVATE, DEACTIVATE, FINISH };

using AnimationsRegistry =
    std::unordered_map<unsigned, std::shared_ptr<CSSAnimation>>;

using AnimationOperationsBatch =
    std::vector<std::pair<AnimationOperation, unsigned>>;

using DelayedAnimationsQueue = std::priority_queue<
    std::pair<time_t, unsigned>,
    std::vector<std::pair<time_t, unsigned>>,
    std::greater<std::pair<time_t, unsigned>>>;

class CSSAnimationsRegistry : public UpdatesRegistry {
 public:
  CSSAnimationsRegistry(
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

  bool hasAnimationUpdates() const;

  void add(const std::shared_ptr<CSSAnimation> &animation);
  void remove(const unsigned id);
  void update(jsi::Runtime &rt, const time_t timestamp);

  void updateSettings(
      jsi::Runtime &rt,
      const unsigned id,
      const PartialCSSAnimationSettings &updatedSettings,
      const time_t timestamp);

 private:
  std::shared_ptr<ViewStylesRepository> viewStylesRepository_;

  AnimationsRegistry animationsRegistry_;
  AnimationOperationsBatch operationsBatch_;

  std::unordered_set<unsigned> runningAnimationIds_;
  DelayedAnimationsQueue delayedAnimationIds_;

  void activateDelayedAnimations(const time_t timestamp);
  void flushOperations(jsi::Runtime &rt, const time_t timestamp);

  inline std::optional<std::shared_ptr<CSSAnimation>> getAnimation(
      const unsigned id);

  void addAnimation(
      jsi::Runtime &rt,
      const std::shared_ptr<CSSAnimation> &animation,
      const time_t timestamp);
  void removeAnimation(
      jsi::Runtime &rt,
      const std::shared_ptr<CSSAnimation> &animation);
  void activateAnimation(const unsigned id);
  void deactivateAnimation(
      const std::shared_ptr<CSSAnimation> &animation,
      const time_t timestamp);
  void finishAnimation(
      jsi::Runtime &rt,
      const std::shared_ptr<CSSAnimation> &animation,
      const time_t timestamp);
};

} // namespace reanimated
