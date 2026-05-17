#pragma once

#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/core/CSSTransition.h>
#include <reanimated/CSS/misc/ViewStylesRepository.h>
#include <reanimated/CSS/utils/DelayedItemsManager.h>
#include <reanimated/Fabric/updates/UpdatesRegistry.h>
#include <reanimated/Tools/PlatformDepMethodsHolder.h>

#include <memory>
#include <mutex>
#include <set>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

namespace reanimated::css {

class CSSTransitionsRegistry : public UpdatesRegistry, public std::enable_shared_from_this<CSSTransitionsRegistry> {
 public:
  CSSTransitionsRegistry(
      const GetAnimationTimestampFunction &getCurrentTimestamp,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

  bool isEmpty() const override;
  bool hasUpdates() const;

  // TO DO: In the future we want to decouple config update and run
  void updateConfigOrRun(
      jsi::Runtime &rt,
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const CSSTransitionConfig &config);
  /// run Should be called only after someone has already set settings with updateConfigOrRun
  void run(
      jsi::Runtime &rt,
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const PropertyValueDiffsMap &propertyDiffs);
  /** TODO: unify folly::dynamic and jsi::value versions */
  void run(const std::shared_ptr<const ShadowNode> &shadowNode, const PropertyValueDynamicDiffsMap &propertyDiffs);

  void updateAndFlush(double timestamp, UpdatesBatch &updatesBatch) {
    const std::lock_guard<std::mutex> lock{mutex_};
    update(timestamp);
    flush(updatesBatch);
  }

#if REACT_NATIVE_VERSION_MINOR >= 85
  void updateAndFlush(facebook::react::AnimationTimestamp timestamp, UpdatesBatchAnimatedProps &updatesBatch) {
    const std::lock_guard<std::mutex> lock{mutex_};
    update(timestamp.count());
    flush(updatesBatch);
  }
#endif

 private:
  using Registry = std::unordered_map<Tag, std::shared_ptr<CSSTransition>>;

  const GetAnimationTimestampFunction &getCurrentTimestamp_;
  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;

  Registry registry_;

  std::unordered_set<Tag> runningTransitionTags_;
  DelayedItemsManager<Tag> delayedTransitionsManager_;

  void removeTag(Tag viewTag) override;
  void update(double timestamp);
  void activateDelayedTransitions(double timestamp);
  void scheduleOrActivateTransition(const std::shared_ptr<CSSTransition> &transition);
  void updateInUpdatesRegistry(const std::shared_ptr<CSSTransition> &transition, const folly::dynamic &updates);
  void runTransition(
      jsi::Runtime &rt,
      const std::shared_ptr<CSSTransition> &transition,
      const facebook::react::Tag &viewTag,
      const PropertyValueDiffsMap &propertyDiffs);
};

} // namespace reanimated::css
