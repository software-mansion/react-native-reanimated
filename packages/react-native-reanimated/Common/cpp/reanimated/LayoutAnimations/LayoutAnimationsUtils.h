#pragma once

#include <react/renderer/components/rnreanimated/Props.h>
#include <react/renderer/mounting/MountingOverrideDelegate.h>
#include <react/renderer/mounting/ShadowView.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsManager.h>

#include <algorithm>
#include <memory>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

namespace reanimated {

enum BeforeOrAfter : std::uint8_t { BEFORE = 0, AFTER = 1 }; // NOLINT

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
  /**
   * RN requested removal but Reanimated suppressed the Remove mutation. Reanimated needs to decide whether to
   * play an exit animation or remove and delete the node.
   */
  TRIAGE = 2,
  WAITING = 3,
  ANIMATING = 4,
  DEAD = 5,
  DELETED = 6,
} ExitingState;

struct MutationNode;

enum class TransitionState : std::uint8_t {
  NONE = 0,
  START = 1,
  ACTIVE = 2,
  END = 3,
  CANCELLED = 4,
};

enum class Intent : std::uint8_t {
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
  // count of children with state != UNDEFINED, maintained by setState and removeChild
  int exitingChildrenCount = 0;

  void setState(ExitingState newState) {
    // states never return to UNDEFINED, so only the first transition increments; removeChild decrements
    const bool startsExiting = state == ExitingState::UNDEFINED && newState != ExitingState::UNDEFINED;
    state = newState;
    if (startsExiting) {
      if (const auto parentNode = parent.lock()) {
        parentNode->exitingChildrenCount++;
      }
    }
  }

  int removeChild(const std::shared_ptr<LightNode> &child) {
    for (int i = static_cast<int>(children.size()) - 1; i >= 0; i--) {
      if (children[i]->current.tag == child->current.tag) {
        if (children[i]->state != ExitingState::UNDEFINED) {
          exitingChildrenCount--;
        }
        children.erase(children.begin() + i);
        return i;
      }
    }
    return -1;
  }

  int findChildIndexByTag(Tag tag) const {
    for (std::size_t i = 0; i < children.size(); i++) {
      if (children[i]->current.tag == tag) {
        return static_cast<int>(i);
      }
    }
    return -1;
  }

  int countExitingChildrenAffectingIndex(int index) const {
    react_native_assert(index >= 0 && "index must be non-negative");
    react_native_assert(
        exitingChildrenCount ==
            std::count_if(
                children.begin(),
                children.end(),
                [](const auto &child) { return child->state != ExitingState::UNDEFINED; }) &&
        "exitingChildrenCount is out of sync");
    if (exitingChildrenCount == 0) {
      return 0;
    }
    int remainingNonExitingChildrenToCheck = index;
    int exitingCount = 0;
    for (std::size_t i = 0; i < children.size(); i++) {
      if (children[i]->state != ExitingState::UNDEFINED) {
        exitingCount++;
        if (exitingCount == exitingChildrenCount) {
          // no exiting children remain past this point
          return exitingCount;
        }
        continue;
      }
      if (remainingNonExitingChildrenToCheck == 0) {
        return exitingCount;
      }
      remainingNonExitingChildrenToCheck--;
    }
    return exitingCount;
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

static inline std::shared_ptr<LightNode> findParentRNSScreen(const std::shared_ptr<LightNode> &node) {
  auto current = node->parent.lock();
  while (current && !isRNSScreen(current)) {
    current = current->parent.lock();
  }
  return current;
}

static inline bool isSETBoundary(const std::shared_ptr<LightNode> &node) {
  return !std::strcmp(node->current.componentName, "REASharedTransitionBoundary");
}

static inline bool isBoundaryActive(const std::shared_ptr<LightNode> &node) {
  auto boundaryProps = std::static_pointer_cast<const REASharedTransitionBoundaryProps>(node->current.props);
  return boundaryProps->isActive;
}

static inline bool isInsideInactiveBoundary(const std::shared_ptr<LightNode> &node) {
  auto current = node->parent.lock();
  while (current) {
    if (isSETBoundary(current)) {
      return !isBoundaryActive(current);
    }
    current = current->parent.lock();
  }
  return false;
}

static inline bool isRoot(const std::shared_ptr<LightNode> &node) {
  return node->current.tag % 10 == 1;
}

static inline bool hasLayoutChanged(const ShadowViewMutation &mutation) {
  return mutation.oldChildShadowView.layoutMetrics.frame != mutation.newChildShadowView.layoutMetrics.frame;
}

} // namespace reanimated
