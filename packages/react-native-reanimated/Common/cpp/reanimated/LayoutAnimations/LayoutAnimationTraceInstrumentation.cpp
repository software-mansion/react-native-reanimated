// LayoutAnimationTrace start
#include <reanimated/LayoutAnimations/LayoutAnimationTraceInstrumentation.h>

#ifndef NDEBUG

#include <reanimated/LayoutAnimations/LayoutAnimationTraceRecorder.h>
#include <reanimated/LayoutAnimations/LayoutAnimationTraceUtils.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxyCommon.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsUtils.h>

#include <folly/dynamic.h>

#include <optional>
#include <utility>

namespace reanimated::layout_animation_trace {

namespace {

void recordMutation(const EventName eventName, const ShadowViewMutation &mutation) {
  Event event;
  event.source = Source::Fabric;
  event.event = eventName;
  event.tag = mutationTag(mutation);
  event.surfaceId = mutationSurfaceId(mutation);
  event.mutation = toTraceMutation(mutation);
  Recorder::getInstance().record(std::move(event));
}

} // namespace

void recordConfigurationQueued(
    const int tag,
    const LayoutAnimationType type,
    const bool configured,
    const bool deferred) {
  Event event;
  event.source = Source::RNJS;
  event.event = EventName::ConfigurationQueued;
  event.tag = tag;
  event.animationType = toTraceAnimationType(type);
  event.details = folly::dynamic::object("configured", configured)("deferred", deferred);
  Recorder::getInstance().record(std::move(event));
}

void recordConfigurationFlushed(
    const int tag,
    const LayoutAnimationType type,
    const bool configured,
    const size_t batchSize) {
  Event event;
  event.source = Source::RNJS;
  event.event = EventName::ConfigurationFlushed;
  event.tag = tag;
  event.animationType = toTraceAnimationType(type);
  event.details = folly::dynamic::object("batchSize", static_cast<int64_t>(batchSize))("configured", configured);
  Recorder::getInstance().record(std::move(event));
}

void recordConfigurationStored(const int tag, const LayoutAnimationType type, const bool configured) {
  Event event;
  event.source = Source::RNJS;
  event.event = EventName::ConfigurationStored;
  event.tag = tag;
  event.animationType = toTraceAnimationType(type);
  event.details = folly::dynamic::object("configured", configured);
  Recorder::getInstance().record(std::move(event));
}

void recordHarnessEvent(
    const EventName eventName,
    const std::optional<bool> finished,
    const std::optional<uint64_t> callbackCount) {
  Event event;
  event.source = Source::RNJS;
  event.event = eventName;
  event.finished = finished;
  event.callbackCount = callbackCount;
  Recorder::getInstance().record(std::move(event));
}

void recordMutationsSeen(const ShadowViewMutationList &mutations) {
  for (const auto &mutation : mutations) {
    recordMutation(EventName::MutationSeen, mutation);
  }
}

void recordMutationsEmitted(const ShadowViewMutationList &mutations) {
  for (const auto &mutation : mutations) {
    auto eventName = EventName::MutationEmitted;
    if (mutation.type == ShadowViewMutation::Remove) {
      eventName = EventName::RemoveEmitted;
    } else if (mutation.type == ShadowViewMutation::Delete) {
      eventName = EventName::DeleteEmitted;
    }
    recordMutation(eventName, mutation);
  }
}

uint64_t recordStartRequested(const LayoutAnimationType type, const ShadowViewMutation &mutation) {
  auto &recorder = Recorder::getInstance();
  const auto tag = mutationTag(mutation);
  const auto generation = recorder.beginGeneration(tag);

  Event event;
  event.source = Source::Fabric;
  event.event = EventName::StartRequested;
  event.tag = tag;
  event.surfaceId = mutationSurfaceId(mutation);
  event.animationType = toTraceAnimationType(type);
  event.generation = generation;
  event.mutation = toTraceMutation(mutation);
  recorder.record(std::move(event));
  return generation;
}

void recordUIRuntimeStarted(
    const int tag,
    const SurfaceId surfaceId,
    const LayoutAnimationType type,
    const uint64_t generation) {
  Event event;
  event.source = Source::UIRuntime;
  event.event = EventName::UIRuntimeStarted;
  event.tag = tag;
  event.surfaceId = surfaceId;
  event.animationType = toTraceAnimationType(type);
  event.generation = generation;
  Recorder::getInstance().record(std::move(event));
}

void recordProgress(
    const int tag,
    const reanimated::LayoutAnimation &layoutAnimation,
    facebook::jsi::Runtime &runtime,
    const facebook::jsi::Object &newStyle) {
  auto progressFrame = toTraceFrame(layoutAnimation.currentView);
  const ::reanimated::Frame frame(runtime, newStyle);
  if (frame.x) {
    progressFrame.x = *frame.x;
  }
  if (frame.y) {
    progressFrame.y = *frame.y;
  }
  if (frame.width) {
    progressFrame.width = *frame.width;
  }
  if (frame.height) {
    progressFrame.height = *frame.height;
  }

  LayerValues layerValues;
  if (newStyle.hasProperty(runtime, "opacity")) {
    const auto opacity = newStyle.getProperty(runtime, "opacity");
    if (opacity.isNumber()) {
      layerValues.opacity = opacity.asNumber();
    }
  }

  Event event;
  event.source = Source::UIRuntime;
  event.event = EventName::Progress;
  event.tag = tag;
  event.surfaceId = layoutAnimation.finalView.surfaceId;
  event.values = Values{
      .model = std::move(layerValues),
      .hostFrame = progressFrame,
  };
  Recorder::getInstance().record(std::move(event));
}

void recordLogicalCompleted(
    const int tag,
    const SurfaceId surfaceId,
    const int pendingAnimationCount,
    const bool shouldRemove) {
  Event event;
  event.source = Source::UIRuntime;
  event.event = EventName::LogicalCompleted;
  event.tag = tag;
  event.surfaceId = surfaceId;
  event.finished = true;
  event.callbackCount = static_cast<uint64_t>(pendingAnimationCount);
  event.details = folly::dynamic::object("shouldRemove", shouldRemove);
  Recorder::getInstance().record(std::move(event));
}

void recordRemovalDelayed(
    const int tag,
    const SurfaceId surfaceId,
    const bool hasOwnExitAnimation,
    const bool hasAnimatedChildren) {
  Event event;
  event.source = Source::Fabric;
  event.event = EventName::RemovalDelayed;
  event.tag = tag;
  event.surfaceId = surfaceId;
  event.animationType = AnimationType::Exiting;
  event.details =
      folly::dynamic::object("hasOwnExitAnimation", hasOwnExitAnimation)("hasAnimatedChildren", hasAnimatedChildren);
  Recorder::getInstance().record(std::move(event));
}

void recordCancelRequested(const int tag) {
  auto &recorder = Recorder::getInstance();
  const auto generation = recorder.getGeneration(tag);
  if (!generation) {
    return;
  }
  Event event;
  event.source = Source::Fabric;
  event.event = EventName::CancelRequested;
  event.tag = tag;
  event.generation = *generation;
  recorder.record(std::move(event));
}

void recordSurfaceFlushRequested(const int tag, const SurfaceId surfaceId) {
  Event event;
  event.source = Source::UIRuntime;
  event.event = EventName::SurfaceFlushRequested;
  event.tag = tag;
  event.surfaceId = surfaceId;
  Recorder::getInstance().record(std::move(event));
}

void recordNativeDescriptor(
    const int tag,
    const LayoutAnimationType type,
    NativeLayoutAnimationDescriptor &descriptor) {
  auto &recorder = Recorder::getInstance();
  const auto generation = recorder.getGeneration(tag).value_or(0);
  descriptor.traceGeneration = generation;
  descriptor.traceAnimationType = toTraceAnimationType(type).value_or(AnimationType::Layout);

  Event descriptorEvent;
  descriptorEvent.source = Source::UIRuntime;
  descriptorEvent.event = EventName::DescriptorCreated;
  descriptorEvent.tag = tag;
  descriptorEvent.animationType = descriptor.traceAnimationType;
  descriptorEvent.generation = generation;
  descriptorEvent.details = folly::dynamic::object("durationMs", descriptor.durationMs)(
      "propertyCount", static_cast<int64_t>(descriptor.properties.size()));
  recorder.record(std::move(descriptorEvent));

  Event scheduledEvent;
  scheduledEvent.source = Source::UIRuntime;
  scheduledEvent.event = EventName::PlatformStartScheduled;
  scheduledEvent.tag = tag;
  scheduledEvent.animationType = descriptor.traceAnimationType;
  scheduledEvent.generation = generation;
  recorder.record(std::move(scheduledEvent));
}

void recordAndroidPlatformCompleted(
    const int tag,
    const uint64_t generation,
    const AnimationType animationType,
    const bool finished) {
  Event event;
  event.source = Source::Android;
  event.event = EventName::PlatformCompleted;
  event.tag = tag;
  event.animationType = animationType;
  event.generation = generation;
  event.finished = finished;
  Recorder::getInstance().record(std::move(event));
}

} // namespace reanimated::layout_animation_trace

#endif // NDEBUG
// LayoutAnimationTrace end
