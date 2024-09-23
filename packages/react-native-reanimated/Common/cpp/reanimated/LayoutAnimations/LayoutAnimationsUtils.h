#pragma once

#include <reanimated/Fabric/PropsRegistry.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsManager.h>

#include <react/renderer/mounting/MountingOverrideDelegate.h>
#include <react/renderer/mounting/ShadowView.h>

#include <memory>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

namespace reanimated {

struct Rect {
  double width, height;
};

struct Frame {
  std::optional<double> x, y, width, height;
  Frame(jsi::Runtime &runtime, const jsi::Object &newStyle) {
    if (newStyle.hasProperty(runtime, "originX")) {
      x = newStyle.getProperty(runtime, "originX").asNumber();
    }
    if (newStyle.hasProperty(runtime, "originY")) {
      y = newStyle.getProperty(runtime, "originY").asNumber();
    }
    if (newStyle.hasProperty(runtime, "width")) {
      width = newStyle.getProperty(runtime, "width").asNumber();
    }
    if (newStyle.hasProperty(runtime, "height")) {
      height = newStyle.getProperty(runtime, "height").asNumber();
    }
  }
};

struct UpdateValues {
  Props::Shared newProps;
  Frame frame;
};

struct Snapshot {
  double x, y, width, height, windowWidth, windowHeight;
  Snapshot(const ShadowView &shadowView, Rect window) {
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
  void insertUnflattenedChildren(
      std::vector<std::shared_ptr<MutationNode>> &newChildren);
  virtual bool isMutationMode();
  explicit Node(const Tag tag) : tag(tag) {}
  Node(Node &&node)
      : children(std::move(node.children)),
        unflattenedChildren(std::move(node.unflattenedChildren)),
        tag(node.tag) {}
  Node(Node &node)
      : children(node.children),
        unflattenedChildren(node.unflattenedChildren),
        tag(node.tag) {}
  virtual ~Node() = default;
};

/**
 Represents a view that was removed from the ShadowTree
 */
struct MutationNode : public Node {
  ShadowViewMutation mutation;
  std::unordered_set<Tag> animatedChildren;
  ExitingState state = UNDEFINED;
  explicit MutationNode(ShadowViewMutation &mutation)
      : Node(mutation.oldChildShadowView.tag), mutation(mutation) {}
  MutationNode(ShadowViewMutation &mutation, Node &&node)
      : Node(std::move(node)), mutation(mutation) {}
  bool isMutationMode() override;
};

struct SurfaceManager {
  mutable std::unordered_map<
      SurfaceId,
      std::shared_ptr<std::unordered_map<Tag, UpdateValues>>>
      props_;
  mutable std::unordered_map<SurfaceId, Rect> windows_;

  std::unordered_map<Tag, UpdateValues> &getUpdateMap(SurfaceId surfaceId);
  void
  updateWindow(SurfaceId surfaceId, double windowWidth, double windowHeight);
  Rect getWindow(SurfaceId surfaceId);
};

static inline void updateLayoutMetrics(
    LayoutMetrics &layoutMetrics,
    Frame &frame) {
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
  return !std::strcmp(
             node->mutation.oldChildShadowView.componentName,
             "RNSScreenStack") ||
      !std::strcmp(
          node->mutation.oldChildShadowView.componentName, "RNSScreen");
}

static inline bool hasLayoutChanged(const ShadowViewMutation &mutation) {
  return mutation.oldChildShadowView.layoutMetrics.frame !=
      mutation.newChildShadowView.layoutMetrics.frame;
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

} // namespace reanimated
