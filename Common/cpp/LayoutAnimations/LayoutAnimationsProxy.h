#pragma once

#include "LayoutAnimationsManager.h"
#include "PropsRegistry.h"
#include <react/renderer/mounting/ShadowView.h>

#include <react/renderer/mounting/MountingOverrideDelegate.h>
#include <react/renderer/componentregistry/ComponentDescriptorFactory.h>

namespace reanimated {

class NativeReanimatedModule;

using namespace facebook;

struct X{
  std::shared_ptr<RawProps> rawProps;
  LayoutMetrics layoutMetrics;
};

struct Values{
  float width, x, y, height;
  Values(ShadowView& shadowView){
    auto& frame = shadowView.layoutMetrics.frame;
    x = frame.origin.x;
    y = frame.origin.y;
    width = frame.size.width;
    height = frame.size.height;
  }
};

struct MutationNode{
  std::unordered_set<std::shared_ptr<MutationNode>> children;
  std::shared_ptr<MutationNode> parent;
};

struct LayoutAnimation {
  int index;
  std::shared_ptr<ShadowView> end, current;
  ShadowView start, parent;
  ShadowViewMutationList initialMutations;
  ShadowViewMutationList cleanupMutations;
  LayoutAnimation(std::shared_ptr<ShadowView> end, std::shared_ptr<ShadowView> current, ShadowView& start, ShadowView parent, ShadowViewMutationList initialMutations, ShadowViewMutationList cleanupMutations):end(end), current(current), start(start), parent(parent), initialMutations(initialMutations), cleanupMutations(cleanupMutations){}
  LayoutAnimation& operator=(const LayoutAnimation& other){
    this->end = other.end;
    return *this;
  }
};

struct LayoutAnimationRegistry{
  mutable std::unordered_map<Tag, X> props_;
  mutable std::unordered_map<Tag, ShadowView> shadowViews_;
  mutable std::unordered_map<Tag, ShadowView> previousShadowViews_;
  mutable std::unordered_map<Tag, ShadowView> parentShadowViews_;
  std::unordered_set<Tag> removedViews_;
};

struct LayoutAnimationsProxy : public MountingOverrideDelegate{
  mutable std::unordered_map<Tag, std::shared_ptr<MutationNode>> nodeForTag;
  mutable std::unordered_map<Tag, LayoutAnimation> layoutAnimations_;
  mutable ShadowViewMutationList cleanupMutations;
  mutable std::unordered_map<Tag, std::shared_ptr<std::unordered_set<int>>> indices;
  std::mutex mutex;
  std::shared_ptr<std::map<Tag, ShadowNode::Shared>> createdNodes_ = std::make_shared<std::map<Tag, ShadowNode::Shared>>();
  std::shared_ptr<std::map<Tag, ShadowView>> createdViews_ = std::make_shared<std::map<Tag, ShadowView>>();
  std::shared_ptr<std::map<Tag, ShadowView>> removedViews_ = std::make_shared<std::map<Tag, ShadowView>>();
  std::shared_ptr<std::map<Tag, ShadowView>> modifiedViews_ = std::make_shared<std::map<Tag, ShadowView>>();
  std::shared_ptr<std::map<Tag, ShadowNode::Shared>> modifiedNodes_ = std::make_shared<std::map<Tag, ShadowNode::Shared>>();
  std::shared_ptr<std::map<Tag,  ShadowView>> modifiedViewsTarget_ = std::make_shared<std::map<Tag,  ShadowView>>();
  std::shared_ptr<std::map<Tag,  ShadowNode::Shared>> modifiedNodesTarget_ = std::make_shared<std::map<Tag,  ShadowNode::Shared>>();
  std::shared_ptr<std::map<Tag, std::string>> tagToNativeID_ = std::make_shared<std::map<Tag, std::string>>();
  std::shared_ptr<LayoutAnimationsManager> layoutAnimationsManager_;
  ContextContainer::Shared contextContainer_;
  LayoutAnimationRegistry layoutAnimationsRegistry_;
  NativeReanimatedModule* nativeReanimatedModule_;
  SharedComponentDescriptorRegistry componentDescriptorRegistry_;
  LayoutAnimationsProxy(std::shared_ptr<LayoutAnimationsManager> layoutAnimationsManager_, NativeReanimatedModule* n, SharedComponentDescriptorRegistry componentDescriptorRegistry_, ContextContainer::Shared contextContainer_): layoutAnimationsManager_(layoutAnimationsManager_), contextContainer_(contextContainer_), nativeReanimatedModule_(n),  componentDescriptorRegistry_(componentDescriptorRegistry_){}
  void startAnimation(const int tag,
                      const LayoutAnimationType type,
                      Values values) const;
  void startLayoutLayoutAnimation(const int tag,
                      Values currentValues, Values targetValues) const;
  void transferConfigFromNativeTag(const int tag);
  void progressLayoutAnimation(int tag, const jsi::Object &newStyle);
  void endLayoutAniamtion(int tag, bool shouldRemove);
  const ComponentDescriptor& getComponentDescriptorForShadowView(const ShadowView& shadowView) const;
  
  void addOngoingAnimations(SurfaceId surfaceId, ShadowViewMutationList& mutations) const;
  void updateIndexForMutation(ShadowViewMutation &mutation) const;
  void updateIndices(ShadowViewMutation &mutation) const;
  
  void takeIndex(Tag parentTag, int index) const;
  void dropIndex(Tag parentTag, int index) const;
  
  // MountingOverrideDelegate
  
  bool shouldOverridePullTransaction() const override;

  std::optional<MountingTransaction> pullTransaction(
      SurfaceId surfaceId,
      MountingTransaction::Number number,
      const TransactionTelemetry& telemetry,
      ShadowViewMutationList mutations) const override;
};

}
