#pragma once

#include <cstdint>
#include <functional>
#include <memory>
#include <unordered_map>
#include <unordered_set>
#include <vector>

#include <react/renderer/components/rnreanimated/REASharedTransitionBoundaryComponentDescriptor.h>
#include <react/renderer/components/view/ViewComponentDescriptor.h>
#include <react/renderer/core/ReactPrimitives.h>
#include <react/renderer/mounting/ShadowTree.h>
#include <react/utils/ContextContainer.h>

namespace reanimated::layout_animation::test {

using MutationCallback = std::shared_ptr<const std::function<void()>>;

MutationCallback mutationCallback(std::function<void()> task);

struct Frame {
  float x{0};
  float y{0};
  float width{0};
  float height{0};
};

struct MutationEffects {
  MutationCallback onMount;
  MutationCallback onUpdate;
  MutationCallback onRemove;
};

struct ViewSpec {
  facebook::react::Tag tag;
  Frame frame;
  std::vector<ViewSpec> children;
  MutationEffects effects;
  bool collapsable{false};
  bool hasNativeId{true};
  bool sharedTransitionBoundary{false};
  bool boundaryActive{false};
  bool displayNone{false};
  uint32_t generation{0};
};

ViewSpec view(facebook::react::Tag tag, Frame frame, std::vector<ViewSpec> children = {}, MutationEffects effects = {});
ViewSpec view(
    facebook::react::Tag tag,
    Frame frame,
    bool collapsable,
    std::vector<ViewSpec> children = {},
    MutationEffects effects = {});
ViewSpec viewInstance(
    facebook::react::Tag tag,
    uint32_t generation,
    Frame frame,
    std::vector<ViewSpec> children = {},
    MutationEffects effects = {});
ViewSpec sharedTransitionBoundary(facebook::react::Tag tag, bool active, std::vector<ViewSpec> children);

struct Snapshot {
  std::vector<ViewSpec> children;
};

class TreeBuilder {
 public:
  TreeBuilder(
      facebook::react::SurfaceId surfaceId,
      std::shared_ptr<const facebook::react::ContextContainer> contextContainer);

  facebook::react::RootShadowNode::Unshared build(
      const facebook::react::RootShadowNode &currentRoot,
      const Snapshot &snapshot);

  const MutationEffects *findEffects(facebook::react::Tag tag) const;

 private:
  using Family = facebook::react::ShadowNodeFamily::Shared;

  std::shared_ptr<const facebook::react::ShadowNode> buildView(
      const ViewSpec &spec,
      std::unordered_set<facebook::react::Tag> &seenTags);
  Family familyFor(facebook::react::Tag tag, uint32_t generation, bool sharedTransitionBoundary);
  void registerEffects(facebook::react::Tag tag, const MutationEffects &effects);

  facebook::react::SurfaceId surfaceId_;
  facebook::react::ViewComponentDescriptor viewDescriptor_;
  facebook::react::REASharedTransitionBoundaryComponentDescriptor sharedTransitionBoundaryDescriptor_;
  std::unordered_map<uint64_t, Family> families_;
  std::unordered_map<facebook::react::Tag, MutationEffects> effects_;
};

} // namespace reanimated::layout_animation::test
