#include <reanimated/LayoutAnimations/FrameDrivenAnimationLease.h>

#include <utility>

namespace reanimated {

FrameDrivenAnimationLease::FrameDrivenAnimationLease(native_animation::AnimationHandle handle) : handle_(handle) {}

const native_animation::AnimationHandle &FrameDrivenAnimationLease::getHandle() const {
  return handle_;
}

void FrameDrivenAnimationLease::revoke() {
  const auto lock = std::lock_guard(mutex_);
  revoked_ = true;
}

FrameDrivenAnimationLeaseWriteGuard::FrameDrivenAnimationLeaseWriteGuard(
    std::shared_ptr<FrameDrivenAnimationLease> lease)
    : lease_(std::move(lease)), lock_(lease_->mutex_) {}

bool FrameDrivenAnimationLeaseWriteGuard::isRevoked() const {
  return lease_ != nullptr && lease_->revoked_;
}

} // namespace reanimated
