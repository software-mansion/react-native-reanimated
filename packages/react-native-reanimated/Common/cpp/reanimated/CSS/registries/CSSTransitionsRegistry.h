#pragma once

#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/core/CSSTransition.h>
#include <reanimated/CSS/misc/ViewStylesRepository.h>
#include <reanimated/CSS/utils/DelayedItemsManager.h>
#include <reanimated/Fabric/updates/UpdatesRegistry.h>
#include <reanimated/Tools/PlatformDepMethodsHolder.h>

#include <memory>
#include <mutex>
#include <unordered_map>
#include <unordered_set>

namespace reanimated::css {

using reanimated::UpdatesBatch;

class CSSTransitionsRegistry {
 public:
  CSSTransitionsRegistry(
      const GetAnimationTimestampFunction &getCurrentTimestamp,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

  std::lock_guard<std::mutex> lock() const;

  bool isEmpty() const;
  bool hasUpdates() const;

  void run(jsi::Runtime &rt, const std::shared_ptr<const ShadowNode> &shadowNode, const CSSTransitionConfig &config);
  void remove(Tag viewTag);

  void update(double timestamp);
  void flushUpdates(UpdatesBatch &updatesBatch);

 private:
  using Registry = std::unordered_map<Tag, std::shared_ptr<CSSTransition>>;

  mutable std::mutex mutex_;
  const GetAnimationTimestampFunction &getCurrentTimestamp_;
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;

  Registry registry_;
  UpdatesBatch updatesBatch_;

  std::unordered_set<Tag> runningTransitionTags_;
  DelayedItemsManager<Tag> delayedTransitionsManager_;

  void activateDelayedTransitions(double timestamp);
  void scheduleOrActivateTransition(const std::shared_ptr<CSSTransition> &transition);
};

} // namespace reanimated::css
