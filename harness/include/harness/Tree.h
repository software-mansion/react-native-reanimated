#pragma once

#include <cstdint>
#include <functional>
#include <memory>
#include <unordered_map>
#include <unordered_set>
#include <vector>

#include <react/renderer/components/rnreanimated/REASharedTransitionBoundaryComponentDescriptor.h>
#include <react/renderer/components/view/ConcreteViewShadowNode.h>
#include <react/renderer/components/view/ViewComponentDescriptor.h>
#include <react/renderer/core/ConcreteComponentDescriptor.h>
#include <react/renderer/core/ReactPrimitives.h>
#include <react/renderer/mounting/ShadowTree.h>
#include <react/renderer/mounting/ShadowView.h>
#include <react/utils/ContextContainer.h>

namespace reanimated::layout_animation::test {

inline constexpr char RNSScreenComponentName[] = "RNSScreen";
using RNSScreenShadowNode = facebook::react::ConcreteViewShadowNode<
    RNSScreenComponentName,
    facebook::react::ViewShadowNodeProps,
    facebook::react::ViewEventEmitter>;
using RNSScreenComponentDescriptor = facebook::react::ConcreteComponentDescriptor<RNSScreenShadowNode>;

inline constexpr char RNSModalScreenComponentName[] = "RNSModalScreen";
using RNSModalScreenShadowNode = facebook::react::ConcreteViewShadowNode<
    RNSModalScreenComponentName,
    facebook::react::ViewShadowNodeProps,
    facebook::react::ViewEventEmitter>;
using RNSModalScreenComponentDescriptor = facebook::react::ConcreteComponentDescriptor<RNSModalScreenShadowNode>;

using MutationCallback = std::shared_ptr<const std::function<void()>>;

MutationCallback mutationCallback(std::function<void()> task);

struct Frame {
  float x{0};
  float y{0};
  float width{0};
  float height{0};

  bool operator==(const Frame &) const = default;
};

struct MutationEffects {
  MutationCallback onMount;
  MutationCallback onUpdate;
  MutationCallback onRemove;
};

enum class NodeKind : uint8_t { View, Screen, ModalScreen, SharedTransitionBoundary };

struct ViewSpec {
  facebook::react::Tag tag;
  Frame frame;
  std::vector<ViewSpec> children;
  MutationEffects effects;
  bool collapsable{false};
  bool hasNativeId{true};
  float opacity{1};
  NodeKind kind{NodeKind::View};
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
ViewSpec screen(facebook::react::Tag tag, std::vector<ViewSpec> children);
ViewSpec modalScreen(facebook::react::Tag tag, std::vector<ViewSpec> children);

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

  const MutationEffects *findEffects(const facebook::react::ShadowView &view) const;

 private:
  using Family = facebook::react::ShadowNodeFamily::Shared;

  struct FamilyEntry {
    Family family;
    NodeKind kind;
  };

  struct NodeEntry {
    ViewSpec spec;
    std::shared_ptr<const facebook::react::ShadowNode> node;
  };

  std::shared_ptr<const facebook::react::ShadowNode> buildView(
      const ViewSpec &spec,
      std::unordered_set<facebook::react::Tag> &seenTags);
  Family familyFor(facebook::react::Tag tag, uint32_t generation, NodeKind kind);
  void registerEffects(const facebook::react::ShadowNode &node, const MutationEffects &effects);

  facebook::react::SurfaceId surfaceId_;
  facebook::react::ViewComponentDescriptor viewDescriptor_;
  RNSScreenComponentDescriptor screenDescriptor_;
  RNSModalScreenComponentDescriptor modalScreenDescriptor_;
  facebook::react::REASharedTransitionBoundaryComponentDescriptor sharedTransitionBoundaryDescriptor_;
  std::unordered_map<uint64_t, FamilyEntry> families_;
  std::unordered_map<uint64_t, NodeEntry> nodes_;
  std::unordered_map<const facebook::react::EventEmitter *, MutationEffects> effects_;
};

} // namespace reanimated::layout_animation::test
