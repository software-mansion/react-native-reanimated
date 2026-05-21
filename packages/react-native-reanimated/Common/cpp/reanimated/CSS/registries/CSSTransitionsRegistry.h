#pragma once

#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/core/CSSTransition.h>
#include <reanimated/CSS/misc/ViewStylesRepository.h>
#include <reanimated/Fabric/updates/OperationsLoop.h>
#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <memory>
#include <unordered_map>
#include <unordered_set>

namespace reanimated::css {

class CSSTransitionsRegistry : public UpdatesRegistry {
 public:
  CSSTransitionsRegistry(
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const std::shared_ptr<OperationsLoop> &loop);

  bool needsFlush() const;

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

  void flushUpdates(UpdatesBatch &updatesBatch);
#if REACT_NATIVE_VERSION_MINOR >= 85
  void flushUpdates(UpdatesBatchAnimatedProps &updatesBatch);
#endif

 private:
  using Registry = std::unordered_map<Tag, std::shared_ptr<CSSTransition>>;

  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;
  const std::shared_ptr<OperationsLoop> loop_;

  Registry registry_;
  std::shared_ptr<std::unordered_set<Tag>> updatedViewTags_;

  void removeTag(Tag viewTag) override;
  void updateInUpdatesRegistry(const std::shared_ptr<CSSTransition> &transition, const folly::dynamic &updates);
  void runTransition(
      jsi::Runtime &rt,
      const std::shared_ptr<CSSTransition> &transition,
      const facebook::react::Tag &viewTag,
      const PropertyValueDiffsMap &propertyDiffs);
};

} // namespace reanimated::css
