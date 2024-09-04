#pragma once

#include "LayoutAnimationsManager.h"
#include "PropsRegistry.h"

#include <react/renderer/mounting/MountingOverrideDelegate.h>
#include <react/renderer/mounting/ShadowView.h>
#include <memory>
#include <string>
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

inline std::string colorToString(const SharedColor &value) {
  ColorComponents components = colorComponentsFromColor(value);
  auto ratio = 255.f;
  return "rgba(" + folly::to<std::string>(round(components.red * ratio)) +
      ", " + folly::to<std::string>(round(components.green * ratio)) + ", " +
      folly::to<std::string>(round(components.blue * ratio)) + ", " +
      folly::to<std::string>(round(components.alpha * ratio)) + ")";
}

struct Snapshot {
  double x, y, width, height, windowWidth, windowHeight;
  double opacity;
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

struct StyleSnapshot {
  int numOfProperties = 10;
  std::string backgroundColor;
  std::string shadowColor;
  char *numericPropertiesNames[10] = {
      "Opacity",
      "BorderRadius",
      "BorderTopLeftRadius",
      "BorderTopRightRadius",
      "BorderBottomLeftRadius",
      "BorderBottomRightRadius",
      "ShadowOffsetHeight",
      "ShadowOffsetWidth",
      "ShadowOpacity",
      "ShadowRadius"};
  std::array<double, 10> numericPropertiesValues;
  StyleSnapshot(const ShadowView &shadowView, Rect window) {
    const ViewProps *props =
        static_cast<const ViewProps *>(shadowView.props.get());

    backgroundColor = colorToString(props->backgroundColor);
    shadowColor = colorToString(props->shadowColor);

    auto opacity = props->opacity;
    auto borderRadius = 0, borderTopLeftRadius = 0, borderTopRightRadius = 0,
         borderBottomLeftRadius = 0, borderBottomRightRadius = 0;

    auto borderRadii = props->borderRadii;
    if (borderRadii.all.has_value()) {
      borderTopLeftRadius = borderTopRightRadius = borderBottomLeftRadius =
          borderBottomRightRadius = props->borderRadii.all.value().value;
      borderRadius = props->borderRadii.all.value().value;
    }
    if (borderRadii.topLeft.has_value()) {
      borderTopLeftRadius = props->borderRadii.topLeft.value().value;
    }
    if (borderRadii.topRight.has_value()) {
      borderTopRightRadius = props->borderRadii.topRight.value().value;
    }
    if (borderRadii.bottomLeft.has_value()) {
      borderBottomLeftRadius = props->borderRadii.bottomLeft.value().value;
    }
    if (borderRadii.bottomRight.has_value()) {
      borderBottomRightRadius = props->borderRadii.bottomRight.value().value;
    }

    auto shadowOffsetHeight = props->shadowOffset.height;
    auto shadowOffsetWidth = props->shadowOffset.width;
    auto shadowOpacity = props->shadowOpacity;
    auto shadowRadius = props->shadowRadius;

    numericPropertiesValues = {
        opacity,
        double(borderRadius),
        double(borderTopLeftRadius),
        double(borderTopRightRadius),
        double(borderBottomLeftRadius),
        double(borderBottomRightRadius),
        shadowOffsetHeight,
        shadowOffsetWidth,
        shadowOpacity,
        shadowRadius};
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
