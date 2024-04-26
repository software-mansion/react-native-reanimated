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
  std::shared_ptr<ShadowView> end, current;
  ShadowView start, parent;
  std::optional<double> opacity;
  LayoutAnimation& operator=(const LayoutAnimation& other){
    this->end = other.end;
    return *this;
  }
};

struct LayoutAnimationsProxy : public MountingOverrideDelegate{
  mutable std::unordered_map<Tag, std::shared_ptr<Node>> nodeForTag;
  mutable std::unordered_map<Tag, LayoutAnimation> layoutAnimations_;
  mutable std::unordered_map<Tag, std::shared_ptr<std::unordered_set<int>>> indices;
  mutable std::unordered_set<Tag> animatedTags;
  mutable std::recursive_mutex mutex;
  mutable std::unordered_set<Tag> bannedTags;
  mutable SurfaceManager surfaceManager;
  std::shared_ptr<std::map<Tag, std::string>> tagToNativeID_ = std::make_shared<std::map<Tag, std::string>>();
  std::shared_ptr<LayoutAnimationsManager> layoutAnimationsManager_;
  ContextContainer::Shared contextContainer_;
  NativeReanimatedModule* nativeReanimatedModule_;
  SharedComponentDescriptorRegistry componentDescriptorRegistry_;
  LayoutAnimationsProxy(std::shared_ptr<LayoutAnimationsManager> layoutAnimationsManager_, NativeReanimatedModule* n, SharedComponentDescriptorRegistry componentDescriptorRegistry_, ContextContainer::Shared contextContainer_): layoutAnimationsManager_(layoutAnimationsManager_), contextContainer_(contextContainer_), nativeReanimatedModule_(n),  componentDescriptorRegistry_(componentDescriptorRegistry_){}
  
  void startEnteringAnimation(const int tag, ShadowViewMutation& mutation) const;
  void startExitingAnimation(const int tag, ShadowViewMutation& mutation) const;
  void startLayoutAnimation(const int tag, ShadowViewMutation& mutation) const;
  
  void transferConfigFromNativeTag(const std::string nativeId, const int tag) const;
  std::optional<SurfaceId> progressLayoutAnimation(int tag, const jsi::Object &newStyle);
  std::optional<SurfaceId> endLayoutAnimation(int tag, bool shouldRemove);
  void cancelAnimation(const int tag) const;
  
  void addOngoingAnimations(SurfaceId surfaceId, ShadowViewMutationList& mutations) const;
  
  void updateIndexForMutation(ShadowViewMutation &mutation) const;
  void updateIndices(ShadowViewMutation &mutation) const;
  void takeIndex(Tag parentTag, int index) const;
  void dropIndex(Tag parentTag, int index) const;
  
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
