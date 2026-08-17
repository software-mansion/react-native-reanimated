#pragma once

#include <reanimated/NativeAnimations/NativeAnimationTypes.h>

namespace reanimated::native_animation {

enum class ConflictAction : uint8_t {
  Replace,
  Reject,
};

class NativeAnimationConflictPolicy {
 public:
  virtual ~NativeAnimationConflictPolicy() = default;
  virtual ConflictAction decide(const AnimationHandle &incoming, const AnimationHandle &existing) const = 0;
};

class DefaultNativeAnimationConflictPolicy final : public NativeAnimationConflictPolicy {
 public:
  ConflictAction decide(const AnimationHandle &incoming, const AnimationHandle &existing) const override;
};

} // namespace reanimated::native_animation
