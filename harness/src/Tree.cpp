#include <harness/Tree.h>

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
      .sharedTransitionBoundary = true,
      .boundaryActive = active,
  };
}

TreeBuilder::TreeBuilder(SurfaceId surfaceId, std::shared_ptr<const ContextContainer> contextContainer)
    : surfaceId_(surfaceId),
      viewDescriptor_(
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

const MutationEffects *TreeBuilder::findEffects(Tag tag) const {
  auto effects = effects_.find(tag);
  return effects == effects_.end() ? nullptr : &effects->second;
}

std::shared_ptr<const ShadowNode> TreeBuilder::buildView(const ViewSpec &spec, std::unordered_set<Tag> &seenTags) {
  if (spec.tag == surfaceId_ || spec.tag <= 0) {
    throw std::invalid_argument("View tags must be positive and differ from the surface tag");
  }
  if (!seenTags.emplace(spec.tag).second) {
    throw std::invalid_argument("Duplicate view tag " + std::to_string(spec.tag));
  }

  registerEffects(spec.tag, spec.effects);

  auto children = std::vector<std::shared_ptr<const ShadowNode>>{};
  children.reserve(spec.children.size());
  for (const auto &child : spec.children) {
    children.push_back(buildView(child, seenTags));
  }

  auto sharedChildren = std::make_shared<const std::vector<std::shared_ptr<const ShadowNode>>>(std::move(children));
  if (spec.sharedTransitionBoundary) {
    auto props = std::make_shared<REASharedTransitionBoundaryProps>();
    props->isActive = spec.boundaryActive;
#ifdef RN_SERIALIZABLE_STATE
    props->rawProps["isActive"] = spec.boundaryActive;
#endif
    props->yogaStyle.setDisplay(yoga::Display::Contents);
    return sharedTransitionBoundaryDescriptor_.createShadowNode(
        ShadowNodeFragment{.props = props, .children = sharedChildren}, familyFor(spec.tag, spec.generation, true));
  }

  auto props = std::make_shared<ViewShadowNodeProps>();
  props->collapsable = spec.collapsable;
  if (spec.hasNativeId) {
    props->nativeId = std::to_string(spec.tag);
  }
  props->yogaStyle.setPositionType(yoga::PositionType::Absolute);
  props->yogaStyle.setPosition(yoga::Edge::Left, yoga::StyleLength::points(spec.frame.x));
  props->yogaStyle.setPosition(yoga::Edge::Top, yoga::StyleLength::points(spec.frame.y));
  props->yogaStyle.setDimension(yoga::Dimension::Width, yoga::StyleSizeLength::points(spec.frame.width));
  props->yogaStyle.setDimension(yoga::Dimension::Height, yoga::StyleSizeLength::points(spec.frame.height));
  if (spec.displayNone) {
    props->yogaStyle.setDisplay(yoga::Display::None);
  }

  return viewDescriptor_.createShadowNode(
      ShadowNodeFragment{
          .props = props,
          .children = sharedChildren,
      },
      familyFor(spec.tag, spec.generation, false));
}

TreeBuilder::Family TreeBuilder::familyFor(Tag tag, uint32_t generation, bool sharedTransitionBoundary) {
  const auto key = static_cast<uint64_t>(static_cast<uint32_t>(tag)) << 32 | generation;
  auto family = families_.find(key);
  if (family != families_.end()) {
    return family->second;
  }

  auto familyFragment = ShadowNodeFamilyFragment{.tag = tag, .surfaceId = surfaceId_, .instanceHandle = nullptr};
  auto created = sharedTransitionBoundary ? sharedTransitionBoundaryDescriptor_.createFamily(familyFragment)
                                          : viewDescriptor_.createFamily(familyFragment);
  families_.emplace(key, created);
  return created;
}

void TreeBuilder::registerEffects(Tag tag, const MutationEffects &effects) {
  if (!effects.onMount && !effects.onUpdate && !effects.onRemove) {
    return;
  }

  auto &registered = effects_[tag];
  registerCallback(registered.onMount, effects.onMount, tag);
  registerCallback(registered.onUpdate, effects.onUpdate, tag);
  registerCallback(registered.onRemove, effects.onRemove, tag);
}

} // namespace reanimated::layout_animation::test
