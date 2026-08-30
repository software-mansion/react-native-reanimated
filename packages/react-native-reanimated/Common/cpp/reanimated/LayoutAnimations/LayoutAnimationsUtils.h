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
  WAITING = 2,
  ANIMATING = 3,
  DEAD = 4,
  DELETED = 5,
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

struct IndexCursor {
  int shadowIndex = -1;
  int hostIndex = -1;
};

// One entry per parent, scoped to a single transaction.
struct IndexCursors {
  IndexCursor remove;
  IndexCursor insert;
  bool invariantChecked = false;
};

struct LightNode {
  ShadowView previous;
  ShadowView current;
  ExitingState state = ExitingState::UNDEFINED;
  std::weak_ptr<LightNode> parent;
  std::vector<std::shared_ptr<LightNode>> children;
  int exitingChildrenCount = 0;

  bool isExiting() const {
    return state != ExitingState::UNDEFINED;
  }

  void setExitingState(ExitingState newState) {
    const bool startsExiting = !isExiting() && newState != ExitingState::UNDEFINED;
    state = newState;
    if (!startsExiting) {
      return;
    }
    if (const auto parentNode = parent.lock()) {
      parentNode->exitingChildrenCount++;
    }
  }

  int removeChild(const std::shared_ptr<LightNode> &child) {
    for (int i = children.size() - 1; i >= 0; i--) {
      if (children[i]->current.tag == child->current.tag) {
        if (children[i]->isExiting()) {
          exitingChildrenCount--;
        }
        children.erase(children.begin() + i);
        return i;
      }
    }
    return -1;
  }

  void clearChildren() {
    children.clear();
    exitingChildrenCount = 0;
  }

  // A new child goes after the exiting children at its shadow position. The differ sends a
  // parent's Removes in descending order and its Inserts in ascending order, so the cursors
  // resume the previous scan; a query out of order falls back to a full scan. Order source:
  // https://github.com/facebook/react-native/blob/v0.87.0/packages/react-native/ReactCommon/react/renderer/mounting/Differentiator.cpp#L1328-L1357
  int toHostIndexForRemove(const int shadowIndex, IndexCursors &cursors) const {
    validateExitingChildrenCount(cursors);
    react_native_assert(
        shadowIndex >= 0 && shadowIndex <= static_cast<int>(children.size()) - exitingChildrenCount &&
        "shadowIndex is out of range");
    if (exitingChildrenCount == 0) {
      return shadowIndex;
    }
    auto &cursor = cursors.remove;
    if (cursor.hostIndex != -1 && shadowIndex < cursor.shadowIndex) {
      int liveChildrenBelow = cursor.shadowIndex;
      for (int hostIndex = cursor.hostIndex - 1; hostIndex >= 0; hostIndex--) {
        if (!children[hostIndex]->isExiting() && --liveChildrenBelow == shadowIndex) {
          cursor = {shadowIndex, hostIndex};
          return hostIndex;
        }
      }
    }
    const int hostIndex = scanToHostIndex(shadowIndex, 0, 0);
    cursor = {shadowIndex, hostIndex};
    return hostIndex;
  }

  int toHostIndexForInsert(const int shadowIndex, IndexCursors &cursors) const {
    validateExitingChildrenCount(cursors);
    react_native_assert(
        shadowIndex >= 0 && shadowIndex <= static_cast<int>(children.size()) - exitingChildrenCount &&
        "shadowIndex is out of range");
    if (exitingChildrenCount == 0) {
      return shadowIndex;
    }
    auto &cursor = cursors.insert;
    int hostIndex = 0;
    if (cursor.hostIndex != -1 && shadowIndex > cursor.shadowIndex) {
      hostIndex = scanToHostIndex(shadowIndex, cursor.hostIndex + 1, cursor.shadowIndex + 1);
    } else {
      hostIndex = scanToHostIndex(shadowIndex, 0, 0);
    }
    cursor = {shadowIndex, hostIndex};
    return hostIndex;
  }

 private:
  int scanToHostIndex(const int shadowIndex, const int startHostIndex, const int startLiveChildren) const {
    const auto childrenCount = static_cast<int>(children.size());
    int hostIndex = startHostIndex;
    int liveChildrenSeen = startLiveChildren;
    int exitingChildrenSeen = 0;
    while (hostIndex < childrenCount && (liveChildrenSeen < shadowIndex || children[hostIndex]->isExiting())) {
      if (children[hostIndex]->isExiting()) {
        if (++exitingChildrenSeen == exitingChildrenCount && startHostIndex == 0) {
          return shadowIndex + exitingChildrenCount;
        }
      } else {
        liveChildrenSeen++;
      }
      hostIndex++;
    }
    return hostIndex;
  }

  void validateExitingChildrenCount(IndexCursors &cursors) const {
    if (cursors.invariantChecked) {
      return;
    }
    react_native_assert(
        exitingChildrenCount ==
            std::count_if(children.begin(), children.end(), [](const auto &child) { return child->isExiting(); }) &&
        "exitingChildrenCount is out of sync");
    cursors.invariantChecked = true;
  }
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
