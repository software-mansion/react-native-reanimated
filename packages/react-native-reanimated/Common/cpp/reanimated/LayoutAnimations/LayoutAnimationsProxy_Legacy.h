#pragma once

#include <react/renderer/componentregistry/ComponentDescriptorFactory.h>
#include <react/renderer/mounting/MountingOverrideDelegate.h>
#include <react/renderer/scheduler/Scheduler.h>
#include <react/renderer/uimanager/UIManagerAnimationDelegate.h>
#include <react/renderer/uimanager/UIManagerBinding.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsManager.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxyCommon.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsUtils.h>
#include <reanimated/Tools/PlatformDepMethodsHolder.h>
#include <worklets/Tools/UIScheduler.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

namespace reanimated {

class ReanimatedModuleProxy;

using namespace facebook;

typedef enum ExitingState_Legacy {
  UNDEFINED = 1,
  WAITING = 2,
  ANIMATING = 4,
  DEAD = 8,
  MOVED = 16,
  DELETED = 32,
} ExitingState_Legacy;

struct MutationNode;

/**
 Represents a view that was either removed or had a child removed from the
 ShadowTree
 */
struct Node {
  std::vector<std::shared_ptr<MutationNode>> children, unflattenedChildren;
  std::shared_ptr<Node> parent, unflattenedParent;
  Tag tag;
  void removeChildFromUnflattenedTree(std::shared_ptr<MutationNode> child);
  void applyMutationToIndices(ShadowViewMutation mutation);
  void insertChildren(std::vector<std::shared_ptr<MutationNode>> &newChildren);
  void insertUnflattenedChildren(std::vector<std::shared_ptr<MutationNode>> &newChildren);
  virtual bool isMutationNode();
  explicit Node(const Tag tag) : tag(tag) {}
  Node(Node &&node)
      : children(std::move(node.children)), unflattenedChildren(std::move(node.unflattenedChildren)), tag(node.tag) {}
  Node(Node &node) : children(node.children), unflattenedChildren(node.unflattenedChildren), tag(node.tag) {}
  virtual ~Node() = default;
};

/**
 Represents a view that was removed from the ShadowTree
 */
struct MutationNode : public Node {
  ShadowViewMutation mutation;
  ExitingState_Legacy state = UNDEFINED;
  explicit MutationNode(ShadowViewMutation &mutation) : Node(mutation.oldChildShadowView.tag), mutation(mutation) {}
  MutationNode(ShadowViewMutation &mutation, Node &&node) : Node(std::move(node)), mutation(mutation) {}
  bool isMutationNode() override;
};

static inline bool isRNSScreen(std::shared_ptr<MutationNode> node) {
  const auto &componentName = node->mutation.oldChildShadowView.componentName;
  return !std::strcmp(componentName, "RNSScreenStack") || !std::strcmp(componentName, "RNSScreen") ||
      !std::strcmp(componentName, "RNSModalScreen");
}

static inline void mergeAndSwap(
    std::vector<std::shared_ptr<MutationNode>> &A,
    std::vector<std::shared_ptr<MutationNode>> &B) {
  std::vector<std::shared_ptr<MutationNode>> merged;
  auto it1 = A.begin(), it2 = B.begin();
  while (it1 != A.end() && it2 != B.end()) {
    if ((*it1)->mutation.index < (*it2)->mutation.index) {
      merged.push_back(*it1);
      it1++;
    } else {
      merged.push_back(*it2);
      it2++;
    }
  }
  while (it1 != A.end()) {
    merged.push_back(*it1);
    it1++;
  }
  while (it2 != B.end()) {
    merged.push_back(*it2);
    it2++;
  }
  std::swap(A, merged);
}

struct SurfaceContext {
  mutable std::unordered_set<std::shared_ptr<MutationNode>> deadNodes;
};

struct LayoutAnimationsProxy_Legacy : public LayoutAnimationsProxyCommon,
                                      public UIManagerAnimationDelegate,
                                      public std::enable_shared_from_this<LayoutAnimationsProxy_Legacy> {
  mutable std::unordered_map<Tag, std::shared_ptr<Node>> nodeForTag_;
  mutable std::recursive_mutex mutex;
  mutable SurfaceManager surfaceManager;
  mutable std::unordered_map<SurfaceId, SurfaceContext> surfaceContext_;
  mutable std::unordered_map<Tag, int> leastRemoved;
  mutable std::unordered_set<SurfaceId> surfacesToRemove_;

  LayoutAnimationsProxy_Legacy(
      std::shared_ptr<LayoutAnimationsManager> layoutAnimationsManager,
      SharedComponentDescriptorRegistry componentDescriptorRegistry,
      std::shared_ptr<const ContextContainer> contextContainer,
      jsi::Runtime &uiRuntime,
      const std::shared_ptr<UIScheduler> &uiScheduler
#ifdef ANDROID
      ,
      PreserveMountedTagsFunction filterUnmountedTagsFunction,
      std::shared_ptr<UIManager> uiManager,
      std::shared_ptr<CallInvoker> jsInvoker
#endif
      )
      : LayoutAnimationsProxyCommon(
            std::move(layoutAnimationsManager),
            std::move(componentDescriptorRegistry),
            std::move(contextContainer),
            uiRuntime,
            uiScheduler
#ifdef ANDROID
            ,
            std::move(filterUnmountedTagsFunction),
            std::move(uiManager),
            std::move(jsInvoker)
#endif
        ) {
  }

  void startEnteringAnimation(const int tag, ShadowViewMutation &mutation) const;
  void startExitingAnimation(const int tag, ShadowViewMutation &mutation) const;
  void startLayoutAnimation(const int tag, const ShadowViewMutation &mutation) const;

  void transferConfigFromNativeID(const std::string &nativeId, const int tag) const;
  std::optional<SurfaceId> progressLayoutAnimation(int tag, const jsi::Object &newStyle) override;
  std::optional<SurfaceId> endLayoutAnimation(int tag, bool shouldRemove) override;
  void maybeCancelAnimation(const int tag) const;

  void parseRemoveMutations(
      std::unordered_map<Tag, Tag> &movedViews,
      ShadowViewMutationList &mutations,
      std::vector<std::shared_ptr<MutationNode>> &roots) const;
  void handleRemovals(
      ShadowViewMutationList &filteredMutations,
      std::vector<std::shared_ptr<MutationNode>> &roots,
      std::unordered_set<std::shared_ptr<MutationNode>> &deadNodes,
      bool shouldAnimate) const;

  void handleUpdatesAndEnterings(
      ShadowViewMutationList &filteredMutations,
      const std::unordered_map<Tag, Tag> &movedViews,
      ShadowViewMutationList &mutations,
      const PropsParserContext &propsParserContext,
      SurfaceId surfaceId) const;
  void addOngoingAnimations(SurfaceId surfaceId, ShadowViewMutationList &mutations) const;
  void updateOngoingAnimationTarget(const int tag, const ShadowViewMutation &mutation) const;
  std::shared_ptr<ShadowView> cloneViewWithoutOpacity(
      facebook::react::ShadowViewMutation &mutation,
      const PropsParserContext &propsParserContext) const;
  void maybeRestoreOpacity(LayoutAnimation &layoutAnimation, const jsi::Object &newStyle) const;
  void maybeUpdateWindowDimensions(facebook::react::ShadowViewMutation &mutation, SurfaceId surfaceId) const;
  void createLayoutAnimation(
      const ShadowViewMutation &mutation,
      ShadowView &oldView,
      const SurfaceId &surfaceId,
      const int tag) const;

  void updateIndexForMutation(ShadowViewMutation &mutation) const;

  void removeRecursively(std::shared_ptr<MutationNode> node, ShadowViewMutationList &mutations) const;
  bool startAnimationsRecursively(
      const std::shared_ptr<MutationNode> &node,
      bool shouldRemoveSubviewsWithoutAnimations,
      bool shouldAnimate,
      bool isScreenPop,
      ShadowViewMutationList &mutations) const;
  void endAnimationsRecursively(const std::shared_ptr<MutationNode> &node, ShadowViewMutationList &mutations) const;
  void maybeDropAncestors(
      const std::shared_ptr<Node> &node,
      const std::shared_ptr<MutationNode> &child,
      ShadowViewMutationList &cleanupMutations) const;

  const ComponentDescriptor &getComponentDescriptorForShadowView(const ShadowView &shadowView) const;
  // MountingOverrideDelegate

  bool shouldOverridePullTransaction() const override;
  std::optional<MountingTransaction> pullTransaction(
      SurfaceId surfaceId,
      MountingTransaction::Number number,
      const TransactionTelemetry &telemetry,
      ShadowViewMutationList mutations) const override;

  // UIManagerAnimationDelegate

  void uiManagerDidConfigureNextLayoutAnimation(
      jsi::Runtime &runtime,
      const RawValue &config,
      const jsi::Value &successCallbackValue,
      const jsi::Value &failureCallbackValue) const override;

  void setComponentDescriptorRegistry(const SharedComponentDescriptorRegistry &componentDescriptorRegistry) override;

  bool shouldAnimateFrame() const override;

  void stopSurface(SurfaceId surfaceId) override;
};

} // namespace reanimated
