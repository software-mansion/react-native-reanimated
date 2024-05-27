#pragma once

#include "LayoutAnimationsManager.h"
#include "PropsRegistry.h"

#include <react/renderer/mounting/ShadowView.h>
#include <react/renderer/mounting/MountingOverrideDelegate.h>
#include <react/renderer/componentregistry/ComponentDescriptorFactory.h>
#include "LayoutAnimationsUtils.h"

namespace reanimated {

class NativeReanimatedModule;

using namespace facebook;

struct LayoutAnimation {
  std::shared_ptr<ShadowView> finalView, currentView, parentView;
  std::optional<double> opacity;
  int count = 1;
  LayoutAnimation& operator=(const LayoutAnimation& other) = default;
};

struct LayoutAnimationsProxy : public MountingOverrideDelegate{
  mutable std::unordered_map<Tag, std::shared_ptr<Node>> nodeForTag;
  mutable std::unordered_map<Tag, LayoutAnimation> layoutAnimations_;
  mutable std::recursive_mutex mutex;
  mutable SurfaceManager surfaceManager;
  mutable std::unordered_set<std::shared_ptr<MutationNode>> deadNodes;
  mutable std::unordered_map<Tag, int> leastRemoved;
  std::shared_ptr<LayoutAnimationsManager> layoutAnimationsManager_;
  ContextContainer::Shared contextContainer_;
  NativeReanimatedModule* nativeReanimatedModule_;
  SharedComponentDescriptorRegistry componentDescriptorRegistry_;
  const std::shared_ptr<UIScheduler> uiScheduler_;
  LayoutAnimationsProxy(std::shared_ptr<LayoutAnimationsManager> layoutAnimationsManager_, NativeReanimatedModule* n, SharedComponentDescriptorRegistry componentDescriptorRegistry_, ContextContainer::Shared contextContainer_, const std::shared_ptr<UIScheduler> uiScheduler_): layoutAnimationsManager_(layoutAnimationsManager_), contextContainer_(contextContainer_), nativeReanimatedModule_(n),  componentDescriptorRegistry_(componentDescriptorRegistry_), uiScheduler_(uiScheduler_){}
  
  void startEnteringAnimation(const int tag, ShadowViewMutation& mutation) const;
  void startExitingAnimation(const int tag, ShadowViewMutation& mutation) const;
  void startLayoutAnimation(const int tag, const ShadowViewMutation& mutation) const;
  
  void transferConfigFromNativeTag(const std::string nativeId, const int tag) const;
  std::optional<SurfaceId> progressLayoutAnimation(int tag, const jsi::Object &newStyle);
  std::optional<SurfaceId> endLayoutAnimation(int tag, bool shouldRemove);
  void maybeCancelAnimation(const int tag) const;
  
  void addOngoingAnimations(SurfaceId surfaceId, ShadowViewMutationList& mutations) const;
  
  void updateIndexForMutation(ShadowViewMutation &mutation) const;
  
  void removeRecursively(std::shared_ptr<MutationNode> node, ShadowViewMutationList& mutations) const;
  bool startAnimationsRecursively(std::shared_ptr<MutationNode> node, bool shouldRemoveSubviewsWithoutAnimations, bool shouldAnimate, ShadowViewMutationList& mutations) const;
  void endAnimationsRecursively(std::shared_ptr<MutationNode> node, ShadowViewMutationList& mutations) const;
  void maybeDropAncestors(std::shared_ptr<Node> node, std::shared_ptr<MutationNode> child, ShadowViewMutationList& cleanupMutations) const;
  
  const ComponentDescriptor& getComponentDescriptorForShadowView(const ShadowView& shadowView) const;
  
  // MountingOverrideDelegate
  
  bool shouldOverridePullTransaction() const override;
  std::optional<MountingTransaction> pullTransaction(
      SurfaceId surfaceId,
      MountingTransaction::Number number,
      const TransactionTelemetry& telemetry,
      ShadowViewMutationList mutations) const override;
};

}
