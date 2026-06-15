#pragma once

#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/core/transition/CSSTransition.h>
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
      const std::shared_ptr<OperationsLoop> &loop,
      const std::shared_ptr<CSSPlatformTransitionProxy> &platformTransitionProxy);

  bool needsFlush() const;

  // TO DO: In the future we want to decouple config update and run
  void updateConfigOrRun(
      jsi::Runtime &rt,
      const std::shared_ptr<const ShadowNode> &shadowNode,
      CSSTransitionConfig &&config);
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

  class TransitionObserver : public CSSTransition::Observer {
   public:
    explicit TransitionObserver(CSSTransitionsRegistry &owner);
    void onTransitionUpdate(Tag viewTag) override;

   private:
    CSSTransitionsRegistry &owner_;
  };

  const std::shared_ptr<ViewStylesRepository> viewStylesRepository_;
  const std::shared_ptr<OperationsLoop> loop_;
  const std::shared_ptr<CSSPlatformTransitionProxy> platformTransitionProxy_;

  TransitionObserver transitionObserver_{*this};

  Registry registry_;
  // Tags reported by owned transitions between flushes.
  std::unordered_set<Tag> updatedTags_;

  void removeTag(Tag viewTag) override;
  void updateInUpdatesRegistry(const std::shared_ptr<CSSTransition> &transition, const folly::dynamic &updates);
  void runTransition(
      jsi::Runtime &rt,
      const std::shared_ptr<CSSTransition> &transition,
      const facebook::react::Tag &viewTag,
      const PropertyValueDiffsMap &propertyDiffs);
};

} // namespace reanimated::css
