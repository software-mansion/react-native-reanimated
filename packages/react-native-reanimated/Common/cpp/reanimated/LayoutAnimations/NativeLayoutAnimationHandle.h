#pragma once

#include <atomic>
#include <memory>

#include <reanimated/NativeAnimations/NativeAnimationTypes.h>

namespace reanimated {

using NativeLayoutAnimationHandle = NativeAnimationHandle;

using NativeLayoutAnimationCancellationToken = std::shared_ptr<std::atomic_bool>;

enum class NativeLayoutAnimationTarget : uint8_t {
  Opacity = 1 << 0,
  Position = 1 << 1,
  BoundsSize = 1 << 2,
  Transform = 1 << 3,
};

using NativeLayoutAnimationTargetMask = uint8_t;

constexpr NativeLayoutAnimationTargetMask targetMask(NativeLayoutAnimationTarget target) {
  return static_cast<NativeLayoutAnimationTargetMask>(target);
}

} // namespace reanimated
