#pragma once

// LayoutAnimationTrace start
#ifndef NDEBUG

#include <reanimated/LayoutAnimations/LayoutAnimationType.h>
#include <reanimated/LayoutAnimations/NativeLayoutAnimationDescriptor.h>

#include <react/renderer/mounting/ShadowViewMutation.h>

#include <jsi/jsi.h>

#include <cstddef>
#include <cstdint>
#include <vector>

namespace reanimated {
struct LayoutAnimation;
}

namespace reanimated::layout_animation_trace {

void recordConfigurationQueued(int tag, LayoutAnimationType type, bool configured, bool deferred);
void recordConfigurationFlushed(int tag, LayoutAnimationType type, bool configured, size_t batchSize);
void recordConfigurationStored(int tag, LayoutAnimationType type, bool configured);
void recordHarnessEvent(
    EventName eventName,
    std::optional<bool> finished = std::nullopt,
    std::optional<uint64_t> callbackCount = std::nullopt);

void recordMutationsSeen(const facebook::react::ShadowViewMutationList &mutations);
void recordMutationsEmitted(const facebook::react::ShadowViewMutationList &mutations);

uint64_t recordStartRequested(LayoutAnimationType type, const facebook::react::ShadowViewMutation &mutation);
void recordUIRuntimeStarted(
    int tag,
    facebook::react::SurfaceId surfaceId,
    LayoutAnimationType type,
    uint64_t generation);
void recordProgress(
    int tag,
    const reanimated::LayoutAnimation &layoutAnimation,
    facebook::jsi::Runtime &runtime,
    const facebook::jsi::Object &newStyle);
void recordLogicalCompleted(
    int tag,
    facebook::react::SurfaceId surfaceId,
    int pendingAnimationCount,
    bool shouldRemove);
void recordRemovalDelayed(
    int tag,
    facebook::react::SurfaceId surfaceId,
    bool hasOwnExitAnimation,
    bool hasAnimatedChildren);
void recordCancelRequested(int tag);
void recordSurfaceFlushRequested(int tag, facebook::react::SurfaceId surfaceId);

void recordNativeDescriptor(int tag, LayoutAnimationType type, NativeLayoutAnimationDescriptor &descriptor);
void recordAndroidPlatformCompleted(
    int tag,
    uint64_t generation,
    AnimationType animationType,
    bool finished,
    bool platformAnimationCreated);

} // namespace reanimated::layout_animation_trace

#endif // NDEBUG
// LayoutAnimationTrace end
