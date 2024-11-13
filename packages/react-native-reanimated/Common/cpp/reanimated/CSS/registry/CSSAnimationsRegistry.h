#pragma once

#include <reanimated/CSS/core/CSSAnimation.h>
#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <functional>
#include <memory>
#include <queue>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

namespace reanimated {

struct DelayedAnimation {
  const unsigned id;
  double startTimestamp;

  DelayedAnimation(unsigned id, double startTimestamp)
      : id(id), startTimestamp(startTimestamp) {}
};

struct DelayedAnimationsComparator {
  bool operator()(
      const std::shared_ptr<DelayedAnimation> &lhs,
      const std::shared_ptr<DelayedAnimation> &rhs) {
    return lhs->startTimestamp > rhs->startTimestamp;
  }
};

class CSSAnimationsRegistry : public UpdatesRegistry {
 public:
  bool hasUpdates() const {
    return !runningAnimationIds_.empty() || !delayedAnimationsMap_.empty();
  }

  void updateSettings(
      jsi::Runtime &rt,
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
      std::shared_ptr<DelayedAnimation>,
      std::vector<std::shared_ptr<DelayedAnimation>>,
      DelayedAnimationsComparator>;

  Registry registry_;

  std::unordered_set<unsigned> runningAnimationIds_;
  std::unordered_map<unsigned, std::shared_ptr<DelayedAnimation>>
      delayedAnimationsMap_;
  DelayedQueue delayedAnimationsQueue_;

  void maybeAddUpdates(
      jsi::Runtime &rt,
      const ShadowNode::Shared &shadowNode,
      const jsi::Value &updatedStyle);
  void applyStyleBeforeStart(
      jsi::Runtime &rt,
      const std::shared_ptr<CSSAnimation> &animation);
  void activateDelayedAnimations(double timestamp);
  void scheduleOrActivateAnimation(
      jsi::Runtime &rt,
      const std::shared_ptr<CSSAnimation> &animation,
      double timestamp);
};

} // namespace reanimated
