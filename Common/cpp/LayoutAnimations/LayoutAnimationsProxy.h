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

struct LayoutAnimation {
  std::shared_ptr<ShadowView> end, current;
  ShadowView start, parent;
  ShadowViewMutationList initialMutations;
  LayoutAnimation(std::shared_ptr<ShadowView> end, std::shared_ptr<ShadowView> current, ShadowView& start, ShadowView parent, ShadowViewMutationList initialMutations):end(end), current(current), start(start), parent(parent), initialMutations(initialMutations){}
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
  mutable std::unordered_map<Tag, LayoutAnimation> layoutAnimations_;
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
  
  // MountingOverrideDelegate
  
  bool shouldOverridePullTransaction() const override;

  std::optional<MountingTransaction> pullTransaction(
      SurfaceId surfaceId,
      MountingTransaction::Number number,
      const TransactionTelemetry& telemetry,
      ShadowViewMutationList mutations) const override;
};

}
