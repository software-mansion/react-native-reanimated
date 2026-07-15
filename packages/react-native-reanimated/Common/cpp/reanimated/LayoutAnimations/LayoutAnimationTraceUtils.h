#pragma once

// LayoutAnimationTrace start
#ifndef NDEBUG

#include <reanimated/LayoutAnimations/LayoutAnimationTrace.h>
#include <reanimated/LayoutAnimations/LayoutAnimationType.h>

#include <react/renderer/mounting/ShadowViewMutation.h>

#include <optional>

namespace reanimated::layout_animation_trace {

inline std::optional<AnimationType> toTraceAnimationType(const LayoutAnimationType type) {
  switch (type) {
    case LayoutAnimationType::ENTERING:
      return AnimationType::Entering;
    case LayoutAnimationType::EXITING:
      return AnimationType::Exiting;
    case LayoutAnimationType::LAYOUT:
      return AnimationType::Layout;
    default:
      return std::nullopt;
  }
}

inline Frame toTraceFrame(const facebook::react::ShadowView &shadowView) {
  const auto &frame = shadowView.layoutMetrics.frame;
  return Frame{
      .x = frame.origin.x,
      .y = frame.origin.y,
      .width = frame.size.width,
      .height = frame.size.height,
  };
}

inline Mutation toTraceMutation(const facebook::react::ShadowViewMutation &mutation) {
  using MutationType = facebook::react::ShadowViewMutation::Type;

  switch (mutation.type) {
    case MutationType::Create:
      return Mutation{
          .type = layout_animation_trace::MutationType::Create,
          .newFrame = toTraceFrame(mutation.newChildShadowView),
      };
    case MutationType::Insert:
      return Mutation{
          .type = layout_animation_trace::MutationType::Insert,
          .parentTag = mutation.parentTag,
          .index = mutation.index,
          .newFrame = toTraceFrame(mutation.newChildShadowView),
      };
    case MutationType::Update:
      return Mutation{
          .type = layout_animation_trace::MutationType::Update,
          .parentTag = mutation.parentTag,
          .oldFrame = toTraceFrame(mutation.oldChildShadowView),
          .newFrame = toTraceFrame(mutation.newChildShadowView),
      };
    case MutationType::Remove:
      return Mutation{
          .type = layout_animation_trace::MutationType::Remove,
          .parentTag = mutation.parentTag,
          .index = mutation.index,
          .oldFrame = toTraceFrame(mutation.oldChildShadowView),
      };
    case MutationType::Delete:
      return Mutation{
          .type = layout_animation_trace::MutationType::Delete,
          .oldFrame = toTraceFrame(mutation.oldChildShadowView),
      };
  }
  return Mutation{.type = layout_animation_trace::MutationType::Update};
}

inline int mutationTag(const facebook::react::ShadowViewMutation &mutation) {
  using MutationType = facebook::react::ShadowViewMutation::Type;
  return mutation.type == MutationType::Create || mutation.type == MutationType::Insert ||
          mutation.type == MutationType::Update
      ? mutation.newChildShadowView.tag
      : mutation.oldChildShadowView.tag;
}

inline int mutationSurfaceId(const facebook::react::ShadowViewMutation &mutation) {
  using MutationType = facebook::react::ShadowViewMutation::Type;
  return mutation.type == MutationType::Create || mutation.type == MutationType::Insert ||
          mutation.type == MutationType::Update
      ? mutation.newChildShadowView.surfaceId
      : mutation.oldChildShadowView.surfaceId;
}

} // namespace reanimated::layout_animation_trace

#endif // NDEBUG
// LayoutAnimationTrace end
