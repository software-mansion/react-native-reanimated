#pragma once

#include <folly/dynamic.h>
#include <react/debug/react_native_assert.h>
#include <react/renderer/components/rnreanimated/Props.h>
#include <react/renderer/components/view/ViewProps.h>
#include <react/renderer/mounting/MountingOverrideDelegate.h>
#include <react/renderer/mounting/ShadowView.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsManager.h>

#include <algorithm>
#include <cstring>
#include <memory>
#include <optional>
#include <string>
#include <unordered_map>
#include <unordered_set>
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
  bool animatesOpacity = false;
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
  // React still renders the view
  LIVE = 1,
  // React deletes the view in the current transaction and the proxy has not decided how it exits yet
  DECISION_PENDING = 2,
  // withheld until its exiting descendants finish
  WAITING = 3,
  // withheld while its own exiting animation runs
  ANIMATING = 4,
  // its exiting animation finished, it is torn down at the next flush
  COMPLETED = 5,
  // the proxy has emitted its Remove and Delete
  TORN_DOWN = 6,
} ExitingState;

struct MutationNode;

// Where the host tree mounts a light node that can carry a shared transition run.
enum class CarrierPlacement : std::uint8_t {
  // The node is not a carrier and is mounted under its parent.
  IN_PARENT,
  // The carrier is mounted under the root, not under its parent.
  AT_ROOT,
  // The carrier is in a moving carrier. It stays under its parent and moves with it.
  NESTED,
};

enum class ReactPresence : std::uint8_t {
  LIVE,
  // React deleted the carrier while it was at the root. The carrier left its logical parent. It and its
  // content stay mounted until its run ends. A nested carrier that React deletes stays LIVE and WAITING.
  REMOVED,
};

enum class TransitionState : std::uint8_t {
  START,
  ACTIVE,
  END,
  CANCELLED,
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
#ifdef ANDROID
  // React Native stores only the props changed by a commit in `Props::rawProps` on Android.
  // The full set accumulates here and becomes a `Props` only when a consumer reads the node.
  folly::dynamic accumulatedRawProps = nullptr;
  // For each prop changed since the last fold, the props of the commit that set it last. Holding
  // them, rather than copying their values into `accumulatedRawProps`, keeps commits cheap.
  std::unordered_map<std::string, Props::Shared> pendingRawPropOwners;
  bool propsNeedResolve = false;

  void foldPendingRawProps() {
    for (const auto &[name, owner] : pendingRawPropOwners) {
      accumulatedRawProps[name] = owner->rawProps.at(name);
    }
    pendingRawPropOwners.clear();
  }
#endif
  ExitingState state = ExitingState::LIVE;
  std::weak_ptr<LightNode> parent;
  std::vector<std::shared_ptr<LightNode>> children;
  int exitingChildrenCount = 0;

  bool isExiting() const {
    return state != ExitingState::LIVE;
  }

  CarrierPlacement placement() const {
    return placement_;
  }

  ReactPresence presence() const {
    return presence_;
  }

  bool isCarrier() const {
    return placement_ != CarrierPlacement::IN_PARENT;
  }

  void setExitingState(ExitingState newState) {
    react_native_assert(newState != ExitingState::LIVE && "A light node never becomes live again");
    const bool startsExiting = !isExiting();
    state = newState;
    if (!startsExiting) {
      return;
    }
    if (const auto parentNode = parent.lock()) {
      parentNode->exitingChildrenCount++;
    }
  }

  // `children` holds the children that React renders and the exiting ones. The host
  // parent holds all of them but the carriers at the root.
  int hostIndex(const int position) const {
    if (childrenAtRootCount_ == 0) {
      return position;
    }
    const auto atRootBefore = std::count_if(children.begin(), children.begin() + position, [](const auto &child) {
      return child->placement_ == CarrierPlacement::AT_ROOT;
    });
    return position - static_cast<int>(atRootBefore);
  }

  int positionOf(const std::shared_ptr<LightNode> &child) const {
    const auto it = std::ranges::find(children, child);
    return it == children.end() ? -1 : static_cast<int>(std::distance(children.begin(), it));
  }

  static void
  insertChild(const std::shared_ptr<LightNode> &parent, const int position, std::shared_ptr<LightNode> child) {
    if (child->placement_ == CarrierPlacement::AT_ROOT) {
      parent->childrenAtRootCount_++;
    }
    child->parent = parent;
    parent->children.insert(parent->children.begin() + position, std::move(child));
  }

  int removeChild(const std::shared_ptr<LightNode> &child) {
    for (int i = static_cast<int>(children.size()) - 1; i >= 0; i--) {
      if (children[i]->current.tag == child->current.tag) {
        react_native_assert(
            children[i]->placement_ != CarrierPlacement::AT_ROOT &&
            "Remove the carrier from the root before unlinking its node");
        if (children[i]->placement_ == CarrierPlacement::AT_ROOT) {
          childrenAtRootCount_--;
        }
        if (children[i]->isExiting()) {
          exitingChildrenCount--;
        }
        children.erase(children.begin() + i);
        return i;
      }
    }
    return -1;
  }

  // A carrier at the root leaves its logical parent when React moves it or deletes it. It stays at the root.
  void extractChildAtRoot(const std::shared_ptr<LightNode> &child) {
    const auto position = positionOf(child);
    react_native_assert(
        position != -1 && child->placement_ == CarrierPlacement::AT_ROOT &&
        "Extract a carrier at the root from its logical parent");
    childrenAtRootCount_--;
    if (child->isExiting()) {
      exitingChildrenCount--;
    }
    children.erase(children.begin() + position);
    child->parent.reset();
  }

  // A new child goes after the exiting children at its shadow position. The differ sends a
  // parent's Removes in descending order and its Inserts in ascending order, so the cursors
  // resume the previous scan; a query out of order falls back to a full scan. A change of the
  // children outside that sequence must reset the cursors. Order source:
  // https://github.com/facebook/react-native/blob/v0.87.0/packages/react-native/ReactCommon/react/renderer/mounting/Differentiator.cpp#L1328-L1357
  int toPositionForRemove(const int shadowIndex, IndexCursors &cursors) const {
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
          react_native_assert(
              hostIndex == scanToHostIndex(shadowIndex, 0, 0) && "A stale index cursor gave a wrong host index");
          cursor = {shadowIndex, hostIndex};
          return hostIndex;
        }
      }
    }
    const int hostIndex = scanToHostIndex(shadowIndex, 0, 0);
    cursor = {shadowIndex, hostIndex};
    return hostIndex;
  }

  int toPositionForInsert(const int shadowIndex, IndexCursors &cursors) const {
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
      react_native_assert(
          hostIndex == scanToHostIndex(shadowIndex, 0, 0) && "A stale index cursor gave a wrong host index");
    } else {
      hostIndex = scanToHostIndex(shadowIndex, 0, 0);
    }
    cursor = {shadowIndex, hostIndex};
    return hostIndex;
  }

 private:
  friend class CarrierPlacements;

  CarrierPlacement placement_ = CarrierPlacement::IN_PARENT;
  ReactPresence presence_ = ReactPresence::LIVE;
  int childrenAtRootCount_ = 0;

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

// The placement and the presence of a light node change only here. This keeps the list of carriers at the root and
// the counts of carriers at the root in their parents in step with the placements.
class CarrierPlacements {
 public:
  // In the order that the host tree mounts them, after the children of the root.
  const std::vector<std::shared_ptr<LightNode>> &atRoot() const {
    return atRoot_;
  }

  int indexAtRoot(const std::shared_ptr<LightNode> &node) const {
    const auto it = std::ranges::find(atRoot_, node);
    react_native_assert(it != atRoot_.end() && "The node is not a carrier at the root");
    return static_cast<int>(std::distance(atRoot_.begin(), it));
  }

  void detach(const std::shared_ptr<LightNode> &node) {
    react_native_assert(node->placement_ != CarrierPlacement::AT_ROOT && "The carrier is already at the root");
    setPlacement(node, CarrierPlacement::AT_ROOT);
    atRoot_.push_back(node);
  }

  void nest(const std::shared_ptr<LightNode> &node) {
    react_native_assert(node->placement_ == CarrierPlacement::IN_PARENT && "The node is already a carrier");
    setPlacement(node, CarrierPlacement::NESTED);
  }

  void attach(const std::shared_ptr<LightNode> &node) {
    react_native_assert(
        node->isCarrier() && node->presence_ == ReactPresence::LIVE && "Only a live carrier returns to its parent");
    leave(node);
  }

  // A removed carrier has no logical parent, so this also unlinks it. It stays mounted at the root.
  void retain(const std::shared_ptr<LightNode> &node) {
    react_native_assert(
        node->placement_ == CarrierPlacement::AT_ROOT && node->presence_ == ReactPresence::LIVE &&
        "React deletes a live carrier at the root");
    const auto parent = node->parent.lock();
    react_native_assert(parent && "A new retained carrier has a parent");
    parent->extractChildAtRoot(node);
    node->presence_ = ReactPresence::REMOVED;
  }

  // The node leaves the host tree. A removed carrier stays removed.
  void tearDown(const std::shared_ptr<LightNode> &node) {
    leave(node);
  }

  void clear() {
    for (const auto &node : atRoot_) {
      setPlacement(node, CarrierPlacement::IN_PARENT);
    }
    atRoot_.clear();
  }

 private:
  std::vector<std::shared_ptr<LightNode>> atRoot_;

  void leave(const std::shared_ptr<LightNode> &node) {
    if (node->placement_ == CarrierPlacement::AT_ROOT) {
      std::erase(atRoot_, node);
    }
    setPlacement(node, CarrierPlacement::IN_PARENT);
  }

  static void setPlacement(const std::shared_ptr<LightNode> &node, const CarrierPlacement placement) {
    const bool wasAtRoot = node->placement_ == CarrierPlacement::AT_ROOT;
    const bool isAtRoot = placement == CarrierPlacement::AT_ROOT;
    node->placement_ = placement;
    if (wasAtRoot == isAtRoot) {
      return;
    }
    if (const auto parent = node->parent.lock()) {
      parent->childrenAtRootCount_ += isAtRoot ? 1 : -1;
    }
  }
};

static inline void
updateLayoutMetrics(LayoutMetrics &layoutMetrics, const Frame &frame, const react::Point &offset = {}) {
  // we use optional's here to avoid overwriting non-animated values
  if (frame.width) {
    layoutMetrics.frame.size.width = *frame.width;
  }
  if (frame.height) {
    layoutMetrics.frame.size.height = *frame.height;
  }
  if (frame.x) {
    layoutMetrics.frame.origin.x = *frame.x + offset.x;
  }
  if (frame.y) {
    layoutMetrics.frame.origin.y = *frame.y + offset.y;
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

static inline std::shared_ptr<LightNode> findScreenBelow(const std::shared_ptr<LightNode> &screen) {
  const auto stack = screen->parent.lock();
  if (!stack) {
    return nullptr;
  }
  const auto screenIt = std::ranges::find(stack->children, screen);
  for (auto below = std::make_reverse_iterator(screenIt); below != stack->children.rend(); ++below) {
    if (isRNSScreen(*below)) {
      return *below;
    }
  }
  return nullptr;
}

static inline std::shared_ptr<LightNode> findScreenInStackOf(
    const std::shared_ptr<LightNode> &node,
    const std::shared_ptr<LightNode> &screen) {
  const auto stack = screen->parent.lock();
  for (auto current = findParentRNSScreen(node); current; current = findParentRNSScreen(current)) {
    if (current->parent.lock() == stack) {
      return current;
    }
  }
  return nullptr;
}

static inline bool isInSubtree(std::shared_ptr<LightNode> node, const std::shared_ptr<LightNode> &root) {
  for (; node; node = node->parent.lock()) {
    if (node == root) {
      return true;
    }
  }
  return false;
}

// A view that React moved keeps its old parent until the Insert, but that parent no longer holds it.
static inline bool isLinkedInSubtree(const std::shared_ptr<LightNode> &node, const std::shared_ptr<LightNode> &root) {
  for (auto child = node, parent = node->parent.lock(); child != root; child = parent, parent = parent->parent.lock()) {
    if (!parent || parent->positionOf(child) == -1) {
      return false;
    }
  }
  return true;
}

static inline bool isInRetainedCarrier(std::shared_ptr<LightNode> node) {
  for (; node; node = node->parent.lock()) {
    if (node->presence() == ReactPresence::REMOVED) {
      return true;
    }
  }
  return false;
}

static inline bool isDescendantOfAny(
    const std::shared_ptr<LightNode> &node,
    const std::vector<std::shared_ptr<LightNode>> &views) {
  const auto parent = node->parent.lock();
  return std::ranges::any_of(views, [&parent](const auto &view) { return isInSubtree(parent, view); });
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

static inline bool isViewKind(const ShadowView &view) {
  return view.traits.check(ShadowNodeTraits::Trait::ViewKind);
}

static inline const ViewProps &getViewProps(const ShadowView &view) {
  react_native_assert(isViewKind(view) && "Only ViewKind views have ViewProps");
  return static_cast<const ViewProps &>(*view.props);
}

static inline double defaultViewOpacity() {
  static const double opacity = ViewProps{}.opacity;
  return opacity;
}

// Android mounts the Deletes of a transaction after its Creates, so a transaction that deletes and
// creates one tag loses the created view.
static inline bool deletesCreatedTag(const ShadowViewMutationList &mutations) {
  std::unordered_set<Tag> created;
  for (const auto &mutation : mutations) {
    if (mutation.type == ShadowViewMutation::Create) {
      created.insert(mutation.newChildShadowView.tag);
    }
  }
  return std::ranges::any_of(mutations, [&created](const auto &mutation) {
    return mutation.type == ShadowViewMutation::Delete && created.contains(mutation.oldChildShadowView.tag);
  });
}

} // namespace reanimated
