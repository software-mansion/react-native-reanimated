#pragma once

#include <reanimated/LayoutAnimations/NativeLayoutAnimationDescriptor.h>
#include <reanimated/LayoutAnimations/NativeLayoutAnimationHandle.h>

#include <functional>

namespace reanimated {

using RunNativeLayoutAnimation = std::function<void(
    NativeAnimationHandle handle,
    const NativeLayoutAnimationDescriptor &descriptor,
    bool usePresentationLayer,
    NativeLayoutAnimationCancellationToken cancellationToken,
    std::function<void(bool)> &&completion)>;

using CancelNativeLayoutAnimation = std::function<void(NativeAnimationHandle handle)>;

} // namespace reanimated
