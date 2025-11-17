#pragma once

#include <react/renderer/componentregistry/ComponentDescriptorFactory.h>
#include <react/renderer/mounting/MountingOverrideDelegate.h>
#include <react/renderer/scheduler/Scheduler.h>
#include <react/renderer/uimanager/UIManagerBinding.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsManager.h>
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

#pragma once

struct Rect {
  double width, height;
};

struct Frame {
  std::optional<double> x, y, width, height;
  Frame(jsi::Runtime &runtime, const jsi::Object &obj) {
    if (obj.hasProperty(runtime, "originX")) {
      x = obj.getProperty(runtime, "originX").asNumber();
    }
    if (obj.hasProperty(runtime, "originY")) {
      y = obj.getProperty(runtime, "originY").asNumber();
    }
    if (obj.hasProperty(runtime, "width")) {
      width = obj.getProperty(runtime, "width").asNumber();
    }
    if (obj.hasProperty(runtime, "height")) {
      height = obj.getProperty(runtime, "height").asNumber();
    }
  }
};

struct UpdateValues {
  Props::Shared newProps;
  Frame frame;
};

struct Snapshot {
  double x, y, width, height, windowWidth, windowHeight;
  Snapshot(const ShadowView &shadowView, const Rect &window) {
    const auto &frame = shadowView.layoutMetrics.frame;
    x = frame.origin.x;
    y = frame.origin.y;
    width = frame.size.width;
    height = frame.size.height;
    windowWidth = window.width;
    windowHeight = window.height;
  }
};

typedef enum ExitingState {
  UNDEFINED = 1,
  WAITING = 2,
  ANIMATING = 4,
  DEAD = 8,
  MOVED = 16,
  DELETED = 32,
} ExitingState;

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
  virtual bool isMutationMode();
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
  ExitingState state = UNDEFINED;
  explicit MutationNode(ShadowViewMutation &mutation) : Node(mutation.oldChildShadowView.tag), mutation(mutation) {}
  MutationNode(ShadowViewMutation &mutation, Node &&node) : Node(std::move(node)), mutation(mutation) {}
  bool isMutationMode() override;
};

struct SurfaceManager {
  mutable std::unordered_map<SurfaceId, std::shared_ptr<std::unordered_map<Tag, UpdateValues>>> props_;
  mutable std::unordered_map<SurfaceId, Rect> windows_;

  std::unordered_map<Tag, UpdateValues> &getUpdateMap(SurfaceId surfaceId);
  void updateWindow(SurfaceId surfaceId, double windowWidth, double windowHeight);
  Rect getWindow(SurfaceId surfaceId);
};

static inline void updateLayoutMetrics(LayoutMetrics &layoutMetrics, Frame &frame) {
  // we use optional's here to avoid overwriting non-animated values
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

static inline bool isRNSScreen(std::shared_ptr<MutationNode> node) {
  const auto &componentName = node->mutation.oldChildShadowView.componentName;
  return !std::strcmp(componentName, "RNSScreenStack") || !std::strcmp(componentName, "RNSScreen") ||
      !std::strcmp(componentName, "RNSModalScreen");
}

static inline bool hasLayoutChanged(const ShadowViewMutation &mutation) {
  return mutation.oldChildShadowView.layoutMetrics.frame != mutation.newChildShadowView.layoutMetrics.frame;
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

struct LayoutAnimation {
  std::shared_ptr<ShadowView> finalView, currentView;
  Tag parentTag;
  std::optional<double> opacity;
  bool isViewAlreadyMounted = false;
  int count = 1;
  LayoutAnimation &operator=(const LayoutAnimation &other) = default;
};

struct LayoutAnimationsProxy_Legacy : public MountingOverrideDelegate,
                                      public std::enable_shared_from_this<LayoutAnimationsProxy_Legacy> {
  mutable std::unordered_map<Tag, std::shared_ptr<Node>> nodeForTag_;
  mutable std::unordered_map<Tag, LayoutAnimation> layoutAnimations_;
  mutable std::recursive_mutex mutex;
  mutable SurfaceManager surfaceManager;
  mutable std::unordered_set<std::shared_ptr<MutationNode>> deadNodes;
  mutable std::unordered_map<Tag, int> leastRemoved;
  mutable std::vector<Tag> finishedAnimationTags_;
  std::shared_ptr<LayoutAnimationsManager> layoutAnimationsManager_;
  std::shared_ptr<const ContextContainer> contextContainer_;
  SharedComponentDescriptorRegistry componentDescriptorRegistry_;
  jsi::Runtime &uiRuntime_;
  const std::shared_ptr<UIScheduler> uiScheduler_;
  PreserveMountedTagsFunction preserveMountedTags_;
#ifdef ANDROID
  std::shared_ptr<UIManager> uiManager_;
  std::shared_ptr<CallInvoker> jsInvoker_;
#endif

  LayoutAnimationsProxy_Legacy(
      std::shared_ptr<LayoutAnimationsManager> layoutAnimationsManager,
      SharedComponentDescriptorRegistry componentDescriptorRegistry,
      std::shared_ptr<const ContextContainer> contextContainer,
      jsi::Runtime &uiRuntime,
      const std::shared_ptr<UIScheduler> uiScheduler
#ifdef ANDROID
      ,
      PreserveMountedTagsFunction filterUnmountedTagsFunction,
      std::shared_ptr<UIManager> uiManager,
      std::shared_ptr<CallInvoker> jsInvoker
#endif
      )
      : layoutAnimationsManager_(layoutAnimationsManager),
        contextContainer_(contextContainer),
        componentDescriptorRegistry_(componentDescriptorRegistry),
        uiRuntime_(uiRuntime),
        uiScheduler_(uiScheduler)
#ifdef ANDROID
        ,
        preserveMountedTags_(filterUnmountedTagsFunction),
        uiManager_(uiManager),
        jsInvoker_(jsInvoker)
#endif // ANDROID
  {
  }

  void startEnteringAnimation(const int tag, ShadowViewMutation &mutation) const;
  void startExitingAnimation(const int tag, ShadowViewMutation &mutation) const;
  void startLayoutAnimation(const int tag, const ShadowViewMutation &mutation) const;

  void transferConfigFromNativeID(const std::string nativeId, const int tag) const;
  std::optional<SurfaceId> progressLayoutAnimation(int tag, const jsi::Object &newStyle);
  std::optional<SurfaceId> endLayoutAnimation(int tag, bool shouldRemove);
  void maybeCancelAnimation(const int tag) const;

  void parseRemoveMutations(
      std::unordered_map<Tag, Tag> &movedViews,
      ShadowViewMutationList &mutations,
      std::vector<std::shared_ptr<MutationNode>> &roots) const;
  void handleRemovals(ShadowViewMutationList &filteredMutations, std::vector<std::shared_ptr<MutationNode>> &roots)
      const;

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
      std::shared_ptr<MutationNode> node,
      const bool shouldRemoveSubviewsWithoutAnimations,
      const bool shouldAnimate,
      const bool isScreenPop,
      ShadowViewMutationList &mutations) const;
  void endAnimationsRecursively(std::shared_ptr<MutationNode> node, ShadowViewMutationList &mutations) const;
  void maybeDropAncestors(
      std::shared_ptr<Node> node,
      std::shared_ptr<MutationNode> child,
      ShadowViewMutationList &cleanupMutations) const;

  const ComponentDescriptor &getComponentDescriptorForShadowView(const ShadowView &shadowView) const;
#ifdef ANDROID
  void restoreOpacityInCaseOfFlakyEnteringAnimation(SurfaceId surfaceId) const;
  const ShadowNode *findInShadowTreeByTag(const ShadowNode &node, Tag tag) const;
#endif // ANDROID
  // MountingOverrideDelegate

  bool shouldOverridePullTransaction() const override;
  std::optional<MountingTransaction> pullTransaction(
      SurfaceId surfaceId,
      MountingTransaction::Number number,
      const TransactionTelemetry &telemetry,
      ShadowViewMutationList mutations) const override;
};

} // namespace reanimated
