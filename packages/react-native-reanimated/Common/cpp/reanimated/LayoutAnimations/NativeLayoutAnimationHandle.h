#pragma once

#include <atomic>
#include <cstdint>
#include <memory>

namespace reanimated {

// Temporary layout-owned identity used while stabilizing the native layout
// animation PoC. It deliberately lives beside, rather than inside, the sampled
// descriptor: lifecycle identity and animation data have different owners.
// Objective 05 replaces this with the shared (surface, tag, owner, generation)
// NativeAnimationHandle.
struct NativeLayoutAnimationHandle {
  int tag;
  uint64_t generation;
};

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
