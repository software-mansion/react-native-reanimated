#pragma once

// LayoutAnimationTrace start
#ifndef NDEBUG

#import <reanimated/LayoutAnimations/NativeLayoutAnimationDescriptor.h>
#import <reanimated/apple/REAUIView.h>

#import <React/RCTComponentViewProtocol.h>
#import <React/RCTPrimitives.h>

#import <folly/dynamic.h>
#import <optional>

namespace reanimated::layout_animation_trace {

void recordApplePostMountObserved(
    ReactTag viewTag,
    const NativeLayoutAnimationDescriptor &descriptor,
    REAUIView<RCTComponentViewProtocol> *componentView);
void recordAppleNativeViewLookup(
    ReactTag viewTag,
    const NativeLayoutAnimationDescriptor &descriptor,
    REAUIView<RCTComponentViewProtocol> *componentView);
void recordApplePlatformStarted(
    ReactTag viewTag,
    const NativeLayoutAnimationDescriptor &descriptor,
    REAUIView<RCTComponentViewProtocol> *componentView,
    std::optional<folly::dynamic> details = std::nullopt);
void recordAppleModelPresentationSample(
    ReactTag viewTag,
    const NativeLayoutAnimationDescriptor &descriptor,
    REAUIView<RCTComponentViewProtocol> *componentView);
void recordApplePlatformCompleted(
    ReactTag viewTag,
    const NativeLayoutAnimationDescriptor &descriptor,
    REAUIView<RCTComponentViewProtocol> *componentView,
    bool finished,
    bool platformAnimationCreated);

} // namespace reanimated::layout_animation_trace

#endif // NDEBUG
// LayoutAnimationTrace end
