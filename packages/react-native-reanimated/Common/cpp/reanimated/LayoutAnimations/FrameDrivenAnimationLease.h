#pragma once

#include <reanimated/NativeAnimations/NativeAnimationIdentity.h>

#include <memory>
#include <mutex>

namespace reanimated {

class FrameDrivenAnimationLeaseWriteGuard;

class FrameDrivenAnimationLease {
 public:
  explicit FrameDrivenAnimationLease(native_animation::AnimationHandle handle);

  const native_animation::AnimationHandle &getHandle() const;
  void revoke();

 private:
  friend class FrameDrivenAnimationLeaseWriteGuard;

  native_animation::AnimationHandle handle_;
  std::recursive_mutex mutex_;
  bool revoked_{false};
};

class FrameDrivenAnimationLeaseWriteGuard {
 public:
  FrameDrivenAnimationLeaseWriteGuard() = default;
  explicit FrameDrivenAnimationLeaseWriteGuard(std::shared_ptr<FrameDrivenAnimationLease> lease);

  bool isRevoked() const;

 private:
  // Keep the lease alive until after the mutex is unlocked.
  std::shared_ptr<FrameDrivenAnimationLease> lease_;
  std::unique_lock<std::recursive_mutex> lock_;
};

} // namespace reanimated
