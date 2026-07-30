#pragma once

#include <reanimated/LayoutAnimations/NativeLayoutAnimationHandle.h>
#include <reanimated/NativeAnimations/NativeAnimationPlan.h>

#include <functional>

namespace reanimated {

using RunNativeLayoutAnimation = std::function<void(
    NativeAnimationHandle handle,
    const NativeAnimationPlan &plan,
    NativeLayoutAnimationCancellationToken cancellationToken,
    std::function<void(bool)> &&completion)>;

using CancelNativeLayoutAnimation = std::function<void(NativeAnimationHandle handle)>;

} // namespace reanimated
