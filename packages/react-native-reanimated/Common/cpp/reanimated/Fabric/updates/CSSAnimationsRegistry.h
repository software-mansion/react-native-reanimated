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

enum AnimationOperation { add, remove, activate, deactivate };

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

  void add(const unsigned id, const std::shared_ptr<CSSAnimation> &animation);
  void remove(const unsigned id);
  void update(jsi::Runtime &rt, const double timestamp);

 private:
  std::shared_ptr<ViewStylesRepository> viewStylesRepository_;

  AnimationsRegistry animationsRegistry_;
  AnimationOperationsBatch operationsBatch_;

  std::unordered_set<unsigned> runningAnimationIds_;
  DelayedAnimationsQueue delayedAnimationIds_;

  void activateDelayedAnimations(const double timestamp);
  void flushOperations(jsi::Runtime &rt, const double timestamp);

  inline std::optional<std::shared_ptr<CSSAnimation>> getAnimation(
      const unsigned id);

  void
  addAnimation(jsi::Runtime &rt, const unsigned id, const double timestamp);
  void finishAnimation(jsi::Runtime &rt, const unsigned id);
  void removeAnimation(jsi::Runtime &rt, const unsigned id);
  void activateAnimation(const unsigned id);
  void deactivateAnimation(const unsigned id);
};

} // namespace reanimated
