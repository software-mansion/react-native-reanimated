#pragma once
#include "LayoutAnimationsManager.h"
#include "PropsRegistry.h"
#include <react/renderer/mounting/ShadowView.h>

#include <react/renderer/mounting/MountingOverrideDelegate.h>
#include <react/renderer/componentregistry/ComponentDescriptorFactory.h>

namespace reanimated {

class NativeReanimatedModule;

using namespace facebook;

struct Window{
  double width, height;
};

struct Frame{
  std::optional<double> x, y, width, height;
  Frame(jsi::Runtime& runtime, const jsi::Object &newStyle){
    if (newStyle.hasProperty(runtime, "originX")){
      x = newStyle.getProperty(runtime, "originX").asNumber();
    }
    if (newStyle.hasProperty(runtime, "originY")){
      y = newStyle.getProperty(runtime, "originY").asNumber();
    }
    if (newStyle.hasProperty(runtime, "width")){
      width = newStyle.getProperty(runtime, "width").asNumber();
    }
    if (newStyle.hasProperty(runtime, "height")){
      height = newStyle.getProperty(runtime, "height").asNumber();
    }
  }
};

struct UpdateValues{
  Props::Shared newProps;
  Frame frame;
};

struct Snapshot{
  double x, y, width, height, windowWidth, windowHeight;
  Snapshot(ShadowView& shadowView, Window window){
    auto& frame = shadowView.layoutMetrics.frame;
    x = frame.origin.x;
    y = frame.origin.y;
    width = frame.size.width;
    height = frame.size.height;
    windowWidth = window.width;
    windowHeight = window.height;
  }
};

struct RootNode;

struct MutationNode{
  std::vector<std::shared_ptr<MutationNode>> children;
  std::shared_ptr<MutationNode> parent;
  std::shared_ptr<RootNode> root = nullptr;
  Tag tag;
  ShadowViewMutation mutation;
  std::unordered_set<Tag> animatedChildren;
  bool isAnimatingExit = false;
  bool isDone = false;
  bool isExiting = false;
  MutationNode(ShadowViewMutation& mutation): mutation(mutation){}
  MutationNode(ShadowViewMutation& mutation, RootNode& root);
  void removeChild(std::shared_ptr<MutationNode> child){
    for (int i=0; i<children.size(); i++){
      if (children[i]->tag == child->tag){
        children.erase(children.begin()+i);
        break;
      }
    }
  }
  void addChild(std::shared_ptr<MutationNode> child){
    bool done = false;
    for (auto it = children.begin(); it != children.end(); it++){
      if ((*it)->mutation.index >child->mutation.index){
        children.insert(it, child);
        done = true;
        break;
      }
    }
    if (!done){
      children.push_back(child);
    }
  }
};

struct RootNode{
  std::vector<std::shared_ptr<MutationNode>> children;
  Tag tag;
  void removeChild(std::shared_ptr<MutationNode> child){
    for (int i=0; i<children.size(); i++){
      if (children[i]->tag == child->tag){
        children.erase(children.begin()+i);
        break;
      }
    }
  }
  void addChild(std::shared_ptr<MutationNode> child){
    bool done = false;
    for (auto it = children.begin(); it != children.end(); it++){
      if ((*it)->mutation.index >child->mutation.index){
        children.insert(it, child);
        done = true;
        break;
      }
    }
    if (!done){
      children.push_back(child);
    }
  }
};

struct LayoutAnimation {
  std::shared_ptr<ShadowView> end, current;
  ShadowView start, parent;
  std::optional<double> opacity;
  LayoutAnimation& operator=(const LayoutAnimation& other){
    this->end = other.end;
    return *this;
  }
};

struct SurfaceManager {
  mutable std::unordered_map<SurfaceId, std::shared_ptr<std::unordered_map<Tag, UpdateValues>>> props_;
  mutable std::unordered_map<SurfaceId, Window> windows_;
  std::unordered_map<Tag, UpdateValues>& getUpdateMap(SurfaceId surfaceId){
    auto props = props_.find(surfaceId);
    if (props != props_.end()){
      return *props->second;
    }
    
    auto newProps = std::make_shared<std::unordered_map<Tag, UpdateValues>>();
    props_.insert_or_assign(surfaceId, newProps);
    return *newProps;
  }
  void updateWindow(SurfaceId surfaceId, double windowWidth, double windowHeight){
    windows_.insert_or_assign(surfaceId, Window{windowWidth, windowHeight});
  }
  Window getWindow(SurfaceId surfaceId){
    auto windowIt = windows_.find(surfaceId);
    if (windowIt != windows_.end()){
      return windowIt->second;
    }
    return Window{0,0};
  }
};

struct LayoutAnimationsProxy : public MountingOverrideDelegate{
  mutable std::unordered_map<Tag, std::shared_ptr<RootNode>> rootNodeForTag;
  mutable std::unordered_map<Tag, std::shared_ptr<MutationNode>> nodeForTag;
  mutable std::unordered_map<Tag, LayoutAnimation> layoutAnimations_;
  mutable ShadowViewMutationList cleanupMutations;
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
  void progressLayoutAnimation(int tag, const jsi::Object &newStyle);
  void endLayoutAnimation(int tag, bool shouldRemove);
  void cancelAnimation(const int tag) const;
  
  void addOngoingAnimations(SurfaceId surfaceId, ShadowViewMutationList& mutations) const;
  
  
  void updateIndexForMutation(ShadowViewMutation &mutation) const;
  void updateIndices(ShadowViewMutation &mutation) const;
  void takeIndex(Tag parentTag, int index) const;
  void dropIndex(Tag parentTag, int index) const;
  
  void removeRecursively(std::shared_ptr<MutationNode> node, ShadowViewMutationList& mutations) const;
  bool startAnimationsRecursively(std::shared_ptr<MutationNode> node, bool shouldRemoveSubviewsWithoutAnimations, bool shouldAnimate, ShadowViewMutationList& mutations) const;
  void endAnimationsRecursively(std::shared_ptr<MutationNode> node, ShadowViewMutationList& mutations) const;
  void maybeDropAncestors(std::shared_ptr<MutationNode> node, std::shared_ptr<MutationNode> child) const;
  
  const ComponentDescriptor& getComponentDescriptorForShadowView(const ShadowView& shadowView) const;
  
  // MountingOverrideDelegate
  
  bool shouldOverridePullTransaction() const override;
  std::optional<MountingTransaction> pullTransaction(
      SurfaceId surfaceId,
      MountingTransaction::Number number,
      const TransactionTelemetry& telemetry,
      ShadowViewMutationList mutations) const override;
};

static inline void updateLayoutMetrics(LayoutMetrics& layoutMetrics, Frame& frame){
  if (frame.width) {
    layoutMetrics.frame.size.width = *frame.width;
  }
  if (frame.height) {
    layoutMetrics.frame.size.height = *frame.height;
  }
  if (frame.x) {
    layoutMetrics.frame.origin.x = *frame.x;
  }
  if (frame.y) {
    layoutMetrics.frame.origin.y = *frame.y;
  }
}

}
