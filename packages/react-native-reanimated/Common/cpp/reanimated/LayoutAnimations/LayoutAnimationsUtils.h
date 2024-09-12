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

#ifdef __ANDROID__ // parse color on android
#include <iomanip>
#include <sstream>
#endif

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

#ifdef __ANDROID__
static inline std::string colorToString(const int val) {
  std::stringstream
      invertedHexColorStream; // By default transparency is first, color second
  invertedHexColorStream << std::setfill('0') << std::setw(8) << std::hex
                         << val;

  auto invertedHexColor = invertedHexColorStream.str();
  auto hexColor =
      "#" + invertedHexColor.substr(2, 6) + invertedHexColor.substr(0, 2);

  return hexColor;
}

#else
inline std::string colorToString(const SharedColor &value) {
  ColorComponents components = colorComponentsFromColor(value);
  auto ratio = 255.f;
  return "rgba(" + folly::to<std::string>(round(components.red * ratio)) +
      ", " + folly::to<std::string>(round(components.green * ratio)) + ", " +
      folly::to<std::string>(round(components.blue * ratio)) + ", " +
      folly::to<std::string>(round(components.alpha * ratio)) + ")";
}
#endif

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

inline Float floatFromYogaOptionalFloat(yoga::FloatOptional value) {
  if (value.isUndefined()) {
    return 0;
  }
  if (std::isnan(value.unwrap())) {
    return 0;
  }

  return (Float)value.unwrap();
}

inline Float floatFromYogaBorderWidthValue(const yoga::Style::Length &length) {
  if (length.unit() == yoga::Unit::Point) {
    return floatFromYogaOptionalFloat(length.value());
  }
  // types percent, and auto are not allowed for border width
  return 0;
}

static const int numberOfStringProperties = 2;
static const char *stringPropertiesNames[2] = {
    "BackgroundColor",
    "ShadowColor"};

static const int numberOfNumericProperties = 9;
static const char *numericPropertiesNames[9] = {
    "Opacity", // double

    "BorderTopLeftRadius", // int
    "BorderTopRightRadius",
    "BorderBottomLeftRadius",
    "BorderBottomRightRadius",

    "BorderLeftWidth", // float
    "BorderRightWidth",
    "BorderTopWidth",
    "BorderBottomWidth"};

struct StyleSnapshot {
  std::array<double, 9> numericPropertiesValues;
  std::array<std::string, 2> stringPropertiesValues;

  StyleSnapshot(
      jsi::Runtime &runtime,
      const ShadowView &shadowView,
      Rect window) {
    const ViewProps *props =
        static_cast<const ViewProps *>(shadowView.props.get());

#ifdef __ANDROID__
    // Operator "*" of class SharedColor is overloaded and returns a private
    // class member color_ of type Color
    auto innerBackgroundColor = *props->backgroundColor;
    auto backgroundColor = colorToString(innerBackgroundColor);
    auto innerShadowColor = *props->backgroundColor;
    auto shadowColor = colorToString(innerShadowColor);
#else
    auto backgroundColor = colorToString(props->backgroundColor);
    auto shadowColor = colorToString(props->shadowColor);
#endif

    auto opacity = props->opacity;
    auto borderTopLeftRadius = 0, borderTopRightRadius = 0,
         borderBottomLeftRadius = 0, borderBottomRightRadius = 0;
    auto borderRadii = props->borderRadii;

    if (borderRadii.all.has_value()) {
      borderTopLeftRadius = borderTopRightRadius = borderBottomLeftRadius =
          borderBottomRightRadius = props->borderRadii.all.value().value;
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

    auto leftBorderWidth = floatFromYogaBorderWidthValue(
        props->yogaStyle.border(yoga::Edge::Left));
    auto rightBorderWidth = floatFromYogaBorderWidthValue(
        props->yogaStyle.border(yoga::Edge::Right));
    auto topBorderWidth =
        floatFromYogaBorderWidthValue(props->yogaStyle.border(yoga::Edge::Top));
    auto bottomBorderWidth = floatFromYogaBorderWidthValue(
        props->yogaStyle.border(yoga::Edge::Bottom));

    numericPropertiesValues = {
        opacity,

        static_cast<double>(borderTopLeftRadius), // int
        static_cast<double>(borderTopRightRadius),
        static_cast<double>(borderBottomLeftRadius),
        static_cast<double>(borderBottomRightRadius),

        static_cast<double>(leftBorderWidth), // float
        static_cast<double>(rightBorderWidth),
        static_cast<double>(topBorderWidth),
        static_cast<double>(bottomBorderWidth)};

    stringPropertiesValues = {backgroundColor, shadowColor};
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
