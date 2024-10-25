#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/Fabric/PropsRegistry.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsManager.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsUtils.h>

#include <worklets/Tools/UIScheduler.h>

#include <react/renderer/componentregistry/ComponentDescriptorFactory.h>
#include <react/renderer/mounting/MountingOverrideDelegate.h>
#include <react/renderer/mounting/ShadowView.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>

namespace reanimated {

struct LayoutAnimation {
  std::shared_ptr<facebook::react::ShadowView> finalView, currentView,
      parentView;
  std::optional<double> opacity;
  int count = 1;
  LayoutAnimation &operator=(const LayoutAnimation &other) = default;
};

struct LayoutAnimationsProxy
    : public facebook::react::MountingOverrideDelegate {
  mutable std::unordered_map<facebook::react::Tag, std::shared_ptr<Node>>
      nodeForTag_;
  mutable std::unordered_map<facebook::react::Tag, LayoutAnimation>
      layoutAnimations_;
  mutable std::recursive_mutex mutex;
  mutable SurfaceManager surfaceManager;
  mutable std::unordered_set<std::shared_ptr<MutationNode>> deadNodes;
  mutable std::unordered_map<facebook::react::Tag, int> leastRemoved;
  std::shared_ptr<LayoutAnimationsManager> layoutAnimationsManager_;
  facebook::react::ContextContainer::Shared contextContainer_;
  facebook::react::SharedComponentDescriptorRegistry
      componentDescriptorRegistry_;
  facebook::jsi::Runtime &uiRuntime_;
  const std::shared_ptr<worklets::UIScheduler> uiScheduler_;
  LayoutAnimationsProxy(
      std::shared_ptr<LayoutAnimationsManager> layoutAnimationsManager,
      facebook::react::SharedComponentDescriptorRegistry
          componentDescriptorRegistry,
      facebook::react::ContextContainer::Shared contextContainer,
      facebook::jsi::Runtime &uiRuntime,
      const std::shared_ptr<worklets::UIScheduler> uiScheduler)
      : layoutAnimationsManager_(layoutAnimationsManager),
        contextContainer_(contextContainer),
        componentDescriptorRegistry_(componentDescriptorRegistry),
        uiRuntime_(uiRuntime),
        uiScheduler_(uiScheduler) {}

  void startEnteringAnimation(
      const int tag,
      facebook::react::ShadowViewMutation &mutation) const;
  void startExitingAnimation(
      const int tag,
      facebook::react::ShadowViewMutation &mutation) const;
  void startLayoutAnimation(
      const int tag,
      const facebook::react::ShadowViewMutation &mutation) const;

  void transferConfigFromNativeID(const std::string nativeId, const int tag)
      const;
  std::optional<facebook::react::SurfaceId> progressLayoutAnimation(
      int tag,
      const facebook::jsi::Object &newStyle);
  std::optional<facebook::react::SurfaceId> endLayoutAnimation(
      int tag,
      bool shouldRemove);
  void maybeCancelAnimation(const int tag) const;

  void parseRemoveMutations(
      std::unordered_map<facebook::react::Tag, facebook::react::ShadowView>
          &movedViews,
      facebook::react::ShadowViewMutationList &mutations,
      std::vector<std::shared_ptr<MutationNode>> &roots) const;
  void handleRemovals(
      facebook::react::ShadowViewMutationList &filteredMutations,
      std::vector<std::shared_ptr<MutationNode>> &roots) const;

  void handleUpdatesAndEnterings(
      facebook::react::ShadowViewMutationList &filteredMutations,
      const std::unordered_map<
          facebook::react::Tag,
          facebook::react::ShadowView> &movedViews,
      facebook::react::ShadowViewMutationList &mutations,
      const facebook::react::PropsParserContext &propsParserContext,
      facebook::react::SurfaceId surfaceId) const;
  void addOngoingAnimations(
      facebook::react::SurfaceId surfaceId,
      facebook::react::ShadowViewMutationList &mutations) const;
  void updateOngoingAnimationTarget(
      const int tag,
      const facebook::react::ShadowViewMutation &mutation) const;
  std::shared_ptr<facebook::react::ShadowView> cloneViewWithoutOpacity(
      facebook::react::ShadowViewMutation &mutation,
      const facebook::react::PropsParserContext &propsParserContext) const;
  void maybeRestoreOpacity(
      LayoutAnimation &layoutAnimation,
      const facebook::jsi::Object &newStyle) const;
  void maybeUpdateWindowDimensions(
      facebook::react::ShadowViewMutation &mutation,
      facebook::react::SurfaceId surfaceId) const;
  void createLayoutAnimation(
      const facebook::react::ShadowViewMutation &mutation,
      facebook::react::ShadowView &oldView,
      const facebook::react::SurfaceId &surfaceId,
      const int tag) const;

  void updateIndexForMutation(
      facebook::react::ShadowViewMutation &mutation) const;

  void removeRecursively(
      std::shared_ptr<MutationNode> node,
      facebook::react::ShadowViewMutationList &mutations) const;
  bool startAnimationsRecursively(
      std::shared_ptr<MutationNode> node,
      const bool shouldRemoveSubviewsWithoutAnimations,
      const bool shouldAnimate,
      const bool isScreenPop,
      facebook::react::ShadowViewMutationList &mutations) const;
  void endAnimationsRecursively(
      std::shared_ptr<MutationNode> node,
      facebook::react::ShadowViewMutationList &mutations) const;
  void maybeDropAncestors(
      std::shared_ptr<Node> node,
      std::shared_ptr<MutationNode> child,
      facebook::react::ShadowViewMutationList &cleanupMutations) const;

  const facebook::react::ComponentDescriptor &
  getComponentDescriptorForShadowView(
      const facebook::react::ShadowView &shadowView) const;

  // MountingOverrideDelegate

  bool shouldOverridePullTransaction() const override;
  std::optional<facebook::react::MountingTransaction> pullTransaction(
      facebook::react::SurfaceId surfaceId,
      facebook::react::MountingTransaction::Number number,
      const facebook::react::TransactionTelemetry &telemetry,
      facebook::react::ShadowViewMutationList mutations) const override;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
