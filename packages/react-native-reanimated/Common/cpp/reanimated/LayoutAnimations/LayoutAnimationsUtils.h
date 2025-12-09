#pragma once

#include <reanimated/LayoutAnimations/LayoutAnimationsManager.h>

#include <react/renderer/mounting/MountingOverrideDelegate.h>
#include <react/renderer/mounting/ShadowView.h>

#include <memory>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

namespace reanimated {

enum BeforeOrAfter { BEFORE = 0, AFTER = 1 };

struct Rect {
  double width, height;
};

struct Frame {
  std::optional<double> x, y, width, height;
  Frame(double x, double y, double width, double height) : x(x), y(y), width(width), height(height) {}
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

typedef enum class ExitingState : std::uint8_t {
  UNDEFINED = 1,
  WAITING = 2,
  ANIMATING = 3,
  DEAD = 4,
  DELETED = 5,
} ExitingState;

struct MutationNode;

enum TransitionState {
  NONE = 0,
  START = 1,
  ACTIVE = 2,
  END = 3,
  CANCELLED = 4,
};

enum Intent {
  NO_INTENT = 0,
  TO_MOVE = 1,
  TO_DELETE = 2,
};

struct LightNode {
  ShadowView previous;
  ShadowView current;
  ExitingState state = ExitingState::UNDEFINED;
  std::weak_ptr<LightNode> parent;
  std::vector<std::shared_ptr<LightNode>> children;
  int removeChild(std::shared_ptr<LightNode> child) {
    for (int i = children.size() - 1; i >= 0; i--) {
      if (children[i]->current.tag == child->current.tag) {
        children.erase(children.begin() + i);
        return i;
      }
    }
    return -1;
  }
};

struct SurfaceManager {
  mutable std::unordered_map<SurfaceId, std::shared_ptr<std::unordered_map<Tag, UpdateValues>>> props_;
  mutable std::unordered_map<SurfaceId, Rect> windows_;

  std::unordered_map<Tag, UpdateValues> &getUpdateMap(SurfaceId surfaceId);
  void updateWindow(SurfaceId surfaceId, double windowWidth, double windowHeight);
  Rect getWindow(SurfaceId surfaceId);
};

static inline void updateLayoutMetrics(LayoutMetrics &layoutMetrics, const Frame &frame) {
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

static inline bool isRNSScreenOrStack(const std::shared_ptr<LightNode> &node) {
  const auto componentName = node->current.componentName;
  react_native_assert(componentName && "Component name is nullptr");
  return !std::strcmp(componentName, "RNSScreenStack") || !std::strcmp(componentName, "RNSScreen") ||
      !std::strcmp(componentName, "RNSModalScreen");
}

static inline bool isRNSScreen(const std::shared_ptr<LightNode> &node) {
  const auto componentName = node->current.componentName;
  react_native_assert(componentName && "Component name is nullptr");
  return !std::strcmp(componentName, "RNSScreen") || !std::strcmp(componentName, "RNSModalScreen");
}

static inline bool isRoot(const std::shared_ptr<LightNode> &node) {
  return node->current.tag % 10 == 1;
}

static inline bool hasLayoutChanged(const ShadowViewMutation &mutation) {
  return mutation.oldChildShadowView.layoutMetrics.frame != mutation.newChildShadowView.layoutMetrics.frame;
}

} // namespace reanimated
