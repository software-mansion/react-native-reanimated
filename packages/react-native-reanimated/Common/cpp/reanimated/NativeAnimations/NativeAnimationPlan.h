#pragma once

#include <reanimated/LayoutAnimations/NativeLayoutAnimationDescriptor.h>
#include <reanimated/NativeAnimations/NativeAnimationTypes.h>

namespace reanimated {

// Objective 05 keeps the sampled layout descriptor as an owned transition
// payload. Objective 07 replaces this payload with typed, platform-neutral
// tracks. Lifecycle identity stays in NativeAnimationHandle.
struct NativeAnimationPlan {
  NativeLayoutAnimationDescriptor descriptor;
  NativeAnimationStartValueSource startValueSource;
};

} // namespace reanimated
