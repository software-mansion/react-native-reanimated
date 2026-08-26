#include <harness/Tree.h>

#include <algorithm>
#include <stdexcept>
#include <string>
#include <utility>

#include <react/renderer/components/rnreanimated/Props.h>
#include <react/renderer/components/view/ViewProps.h>
#include <react/renderer/components/view/ViewShadowNode.h>
#include <react/renderer/core/ShadowNodeFragment.h>

namespace reanimated::layout_animation::test {

using namespace facebook::react;
namespace yoga = facebook::yoga;

namespace {

void registerCallback(MutationCallback &registered, const MutationCallback &incoming, Tag tag) {
  if (!incoming) {
    return;
  }
  if (registered && registered != incoming) {
    throw std::invalid_argument("Mutation callback changed for tag " + std::to_string(tag));
  }
  registered = incoming;
}

bool hasSameProps(const ViewSpec &lhs, const ViewSpec &rhs) {
  return lhs.tag == rhs.tag && lhs.frame == rhs.frame && lhs.collapsable == rhs.collapsable &&
      lhs.hasNativeId == rhs.hasNativeId && lhs.opacity == rhs.opacity && lhs.kind == rhs.kind &&
      lhs.boundaryActive == rhs.boundaryActive && lhs.displayNone == rhs.displayNone &&
      lhs.generation == rhs.generation;
}

bool hasSameChildren(const ShadowNode &node, const std::vector<std::shared_ptr<const ShadowNode>> &children) {
  const auto &previousChildren = node.getChildren();
  return previousChildren.size() == children.size() &&
      std::equal(previousChildren.begin(), previousChildren.end(), children.begin());
}

} // namespace

MutationCallback mutationCallback(std::function<void()> task) {
  return std::make_shared<const std::function<void()>>(std::move(task));
}

ViewSpec view(Tag tag, Frame frame, std::vector<ViewSpec> children, MutationEffects effects) {
  return {
      .tag = tag,
      .frame = frame,
      .children = std::move(children),
      .effects = std::move(effects),
  };
}

ViewSpec view(Tag tag, Frame frame, bool collapsable, std::vector<ViewSpec> children, MutationEffects effects) {
  return {
      .tag = tag,
      .frame = frame,
      .children = std::move(children),
      .effects = std::move(effects),
      .collapsable = collapsable,
      .hasNativeId = false,
  };
}

ViewSpec
viewInstance(Tag tag, uint32_t generation, Frame frame, std::vector<ViewSpec> children, MutationEffects effects) {
  return {
      .tag = tag,
      .frame = frame,
      .children = std::move(children),
      .effects = std::move(effects),
      .generation = generation,
  };
}

ViewSpec sharedTransitionBoundary(Tag tag, bool active, std::vector<ViewSpec> children) {
  return {
      .tag = tag,
      .children = std::move(children),
      .hasNativeId = false,
      .kind = NodeKind::SharedTransitionBoundary,
      .boundaryActive = active,
  };
}

ViewSpec screen(Tag tag, std::vector<ViewSpec> children) {
  return {
      .tag = tag,
      .frame = {0, 0, 1024, 1024},
      .children = std::move(children),
      .hasNativeId = false,
      .kind = NodeKind::Screen,
  };
}

ViewSpec modalScreen(Tag tag, std::vector<ViewSpec> children) {
  return {
      .tag = tag,
      .frame = {0, 0, 1024, 1024},
      .children = std::move(children),
      .hasNativeId = false,
      .kind = NodeKind::ModalScreen,
  };
}

TreeBuilder::TreeBuilder(SurfaceId surfaceId, std::shared_ptr<const ContextContainer> contextContainer)
    : surfaceId_(surfaceId),
      viewDescriptor_(
          ComponentDescriptorParameters{
              .eventDispatcher = EventDispatcher::Shared{},
              .contextContainer = contextContainer,
              .flavor = nullptr}),
      screenDescriptor_(
          ComponentDescriptorParameters{
              .eventDispatcher = EventDispatcher::Shared{},
              .contextContainer = contextContainer,
              .flavor = nullptr}),
      modalScreenDescriptor_(
          ComponentDescriptorParameters{
              .eventDispatcher = EventDispatcher::Shared{},
              .contextContainer = contextContainer,
              .flavor = nullptr}),
      sharedTransitionBoundaryDescriptor_(
          ComponentDescriptorParameters{
              .eventDispatcher = EventDispatcher::Shared{},
              .contextContainer = std::move(contextContainer),
              .flavor = nullptr}) {}

RootShadowNode::Unshared TreeBuilder::build(const RootShadowNode &currentRoot, const Snapshot &snapshot) {
  auto seenTags = std::unordered_set<Tag>{};
  auto children = std::vector<std::shared_ptr<const ShadowNode>>{};
  children.reserve(snapshot.children.size());

  for (const auto &child : snapshot.children) {
    children.push_back(buildView(child, seenTags));
  }

  auto sharedChildren = std::make_shared<const std::vector<std::shared_ptr<const ShadowNode>>>(std::move(children));
  auto root = currentRoot.ShadowNode::clone(ShadowNodeFragment{.children = sharedChildren});
  return std::static_pointer_cast<RootShadowNode>(root);
}

const MutationEffects *TreeBuilder::findEffects(const ShadowView &view) const {
  auto effects = effects_.find(view.eventEmitter.get());
  return effects == effects_.end() ? nullptr : &effects->second;
}

std::shared_ptr<const ShadowNode> TreeBuilder::buildView(const ViewSpec &spec, std::unordered_set<Tag> &seenTags) {
  if (spec.tag == surfaceId_ || spec.tag <= 0) {
    throw std::invalid_argument("View tags must be positive and differ from the surface tag");
  }
  if (!seenTags.emplace(spec.tag).second) {
    throw std::invalid_argument("Duplicate view tag " + std::to_string(spec.tag));
  }

  auto children = std::vector<std::shared_ptr<const ShadowNode>>{};
  children.reserve(spec.children.size());
  for (const auto &child : spec.children) {
    children.push_back(buildView(child, seenTags));
  }

  const auto key = static_cast<uint64_t>(static_cast<uint32_t>(spec.tag)) << 32 | spec.generation;
  auto previous = nodes_.find(key);
  const auto sameProps = previous != nodes_.end() && hasSameProps(previous->second.spec, spec);
  const auto sameChildren = previous != nodes_.end() && hasSameChildren(*previous->second.node, children);
  if (sameProps && sameChildren) {
    registerEffects(*previous->second.node, spec.effects);
    return previous->second.node;
  }
  auto sharedChildren = std::make_shared<const std::vector<std::shared_ptr<const ShadowNode>>>(std::move(children));
  Props::Shared props;
  if (spec.kind == NodeKind::SharedTransitionBoundary) {
    auto boundaryProps = std::make_shared<REASharedTransitionBoundaryProps>();
    boundaryProps->isActive = spec.boundaryActive;
#ifdef RN_SERIALIZABLE_STATE
    boundaryProps->rawProps["isActive"] = spec.boundaryActive;
#endif
    boundaryProps->yogaStyle.setDisplay(yoga::Display::Contents);
    props = std::move(boundaryProps);
  } else {
    auto viewProps = std::make_shared<ViewShadowNodeProps>();
    viewProps->collapsable = spec.collapsable;
    viewProps->opacity = spec.opacity;
    if (spec.hasNativeId) {
      viewProps->nativeId = std::to_string(spec.tag);
    }
    viewProps->yogaStyle.setPositionType(yoga::PositionType::Absolute);
    viewProps->yogaStyle.setPosition(yoga::Edge::Left, yoga::StyleLength::points(spec.frame.x));
    viewProps->yogaStyle.setPosition(yoga::Edge::Top, yoga::StyleLength::points(spec.frame.y));
    viewProps->yogaStyle.setDimension(yoga::Dimension::Width, yoga::StyleSizeLength::points(spec.frame.width));
    viewProps->yogaStyle.setDimension(yoga::Dimension::Height, yoga::StyleSizeLength::points(spec.frame.height));
    if (spec.displayNone) {
      viewProps->yogaStyle.setDisplay(yoga::Display::None);
    }
    props = std::move(viewProps);
  }

  const auto fragment = ShadowNodeFragment{
      .props = sameProps ? ShadowNodeFragment::propsPlaceholder() : props,
      .children = sameChildren ? ShadowNodeFragment::childrenPlaceholder() : sharedChildren,
  };
  std::shared_ptr<const ShadowNode> node;
  if (previous != nodes_.end()) {
    node = previous->second.node->clone(fragment);
  } else {
    if (spec.kind == NodeKind::Screen) {
      node = screenDescriptor_.createShadowNode(fragment, familyFor(spec.tag, spec.generation, spec.kind));
    } else if (spec.kind == NodeKind::ModalScreen) {
      node = modalScreenDescriptor_.createShadowNode(fragment, familyFor(spec.tag, spec.generation, spec.kind));
    } else if (spec.kind == NodeKind::SharedTransitionBoundary) {
      node = sharedTransitionBoundaryDescriptor_.createShadowNode(
          fragment, familyFor(spec.tag, spec.generation, spec.kind));
    } else {
      node = viewDescriptor_.createShadowNode(fragment, familyFor(spec.tag, spec.generation, spec.kind));
    }
  }
  registerEffects(*node, spec.effects);
  nodes_.insert_or_assign(key, NodeEntry{spec, node});
  return node;
}

TreeBuilder::Family TreeBuilder::familyFor(Tag tag, uint32_t generation, NodeKind kind) {
  const auto key = static_cast<uint64_t>(static_cast<uint32_t>(tag)) << 32 | generation;
  auto entry = families_.find(key);
  if (entry != families_.end()) {
    if (entry->second.kind != kind) {
      throw std::invalid_argument("View kind changed for tag " + std::to_string(tag));
    }
    return entry->second.family;
  }

  auto familyFragment = ShadowNodeFamilyFragment{.tag = tag, .surfaceId = surfaceId_, .instanceHandle = nullptr};
  Family created;
  switch (kind) {
    case NodeKind::View:
      created = viewDescriptor_.createFamily(familyFragment);
      break;
    case NodeKind::Screen:
      created = screenDescriptor_.createFamily(familyFragment);
      break;
    case NodeKind::ModalScreen:
      created = modalScreenDescriptor_.createFamily(familyFragment);
      break;
    case NodeKind::SharedTransitionBoundary:
      created = sharedTransitionBoundaryDescriptor_.createFamily(familyFragment);
      break;
  }
  families_.emplace(key, FamilyEntry{created, kind});
  return created;
}

void TreeBuilder::registerEffects(const ShadowNode &node, const MutationEffects &effects) {
  if (!effects.onMount && !effects.onUpdate && !effects.onRemove) {
    return;
  }

  auto &registered = effects_[node.getEventEmitter().get()];
  registerCallback(registered.onMount, effects.onMount, node.getTag());
  registerCallback(registered.onUpdate, effects.onUpdate, node.getTag());
  registerCallback(registered.onRemove, effects.onRemove, node.getTag());
}

} // namespace reanimated::layout_animation::test
