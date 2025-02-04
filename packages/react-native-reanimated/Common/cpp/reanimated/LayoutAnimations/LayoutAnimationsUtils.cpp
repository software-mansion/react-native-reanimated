#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/LayoutAnimations/LayoutAnimationsUtils.h>

namespace reanimated {

std::unordered_map<Tag, UpdateValues> &SurfaceManager::getUpdateMap(
    SurfaceId surfaceId) {
  auto props = props_.find(surfaceId);
  if (props != props_.end()) {
    return *props->second;
  }

  auto newProps = std::make_shared<std::unordered_map<Tag, UpdateValues>>();
  props_.insert_or_assign(surfaceId, newProps);
  return *newProps;
}

void SurfaceManager::updateWindow(
    const SurfaceId surfaceId,
    const double windowWidth,
    const double windowHeight) {
  windows_.insert_or_assign(surfaceId, Rect{windowWidth, windowHeight});
}

Rect SurfaceManager::getWindow(SurfaceId surfaceId) {
  auto windowIt = windows_.find(surfaceId);
  if (windowIt != windows_.end()) {
    return windowIt->second;
  }
  return Rect{0, 0};
}

void Node::applyMutationToIndices(ShadowViewMutation mutation) {
#if REACT_NATIVE_MINOR_VERSION >= 78
  const auto parentTag = mutation.parentTag;
#else
  const auto parentTag = mutation.parentShadowView.tag;
#endif // REACT_NATIVE_MINOR_VERSION >= 78

  if (tag != parentTag) {
    return;
  }

  int delta = mutation.type == ShadowViewMutation::Insert ? 1 : -1;
  for (int i = children.size() - 1; i >= 0; i--) {
    if (children[i]->mutation.index < mutation.index) {
      return;
    }
    children[i]->mutation.index += delta;
  }
}

// Should only be called on unflattened parents
void Node::removeChildFromUnflattenedTree(std::shared_ptr<MutationNode> child) {
  for (int i = unflattenedChildren.size() - 1; i >= 0; i--) {
    if (unflattenedChildren[i]->tag == child->tag) {
      unflattenedChildren.erase(unflattenedChildren.begin() + i);
      break;
    }
  }

  auto &flattenedChildren = child->parent->children;
  for (int i = flattenedChildren.size() - 1; i >= 0; i--) {
    if (flattenedChildren[i]->tag == child->tag) {
      flattenedChildren.erase(flattenedChildren.begin() + i);
      return;
    }
    flattenedChildren[i]->mutation.index--;
  }
}

void Node::insertChildren(
    std::vector<std::shared_ptr<MutationNode>> &newChildren) {
  mergeAndSwap(children, newChildren);
}

void Node::insertUnflattenedChildren(
    std::vector<std::shared_ptr<MutationNode>> &newChildren) {
  mergeAndSwap(unflattenedChildren, newChildren);
}

bool Node::isMutationMode() {
  return false;
}

bool MutationNode::isMutationMode() {
  return true;
}
} // namespace reanimated

#endif
