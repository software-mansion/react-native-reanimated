#include <reanimated/LayoutAnimations/FrameDrivenAnimationLease.h>

#include <algorithm>
#include <utility>

namespace reanimated {

FrameDrivenAnimationLease::FrameDrivenAnimationLease(
    native_animation::AnimationHandle handle,
    std::vector<native_animation::AnimationTargetClaim> targets,
    const native_animation::AnimationAdmissionMode admissionMode)
    : handle_(handle), targets_(std::move(targets)), admissionMode_(admissionMode) {}

const native_animation::AnimationHandle &FrameDrivenAnimationLease::getHandle() const {
  return handle_;
}

const std::vector<native_animation::AnimationTargetClaim> &FrameDrivenAnimationLease::getTargets() const {
  return targets_;
}

native_animation::AnimationAdmissionMode FrameDrivenAnimationLease::getAdmissionMode() const {
  return admissionMode_;
}

bool FrameDrivenAnimationLease::covers(
    const std::vector<native_animation::AnimationTargetClaim> &targets,
    const native_animation::AnimationAdmissionMode admissionMode) const {
  if (admissionMode == native_animation::AnimationAdmissionMode::RetainedExit &&
      admissionMode_ != native_animation::AnimationAdmissionMode::RetainedExit) {
    return false;
  }
  const bool claimsEveryTarget = std::ranges::any_of(targets_, [](const native_animation::AnimationTargetClaim &claim) {
    return std::holds_alternative<native_animation::AllVisualTargets>(claim);
  });
  if (claimsEveryTarget) {
    return true;
  }
  return std::ranges::all_of(targets, [&](const native_animation::AnimationTargetClaim &target) {
    return std::ranges::find(targets_, target) != targets_.end();
  });
}

void FrameDrivenAnimationLease::revoke() {
  const auto lock = std::lock_guard(mutex_);
  revoked_ = true;
}

bool FrameDrivenAnimationLease::isRevoked() const {
  return revoked_;
}

void FrameDrivenAnimationLease::suspendWrites() {
  const auto lock = std::lock_guard(mutex_);
  suspended_ = true;
}

void FrameDrivenAnimationLease::resumeWrites() {
  const auto lock = std::lock_guard(mutex_);
  suspended_ = false;
}

bool FrameDrivenAnimationLease::acceptsWrites() const {
  return !revoked_ && !suspended_;
}

void FrameDrivenAnimationLease::setSuperseded(const bool superseded) {
  superseded_ = superseded;
}

bool FrameDrivenAnimationLease::isSuperseded() const {
  return superseded_;
}

FrameDrivenAnimationLeaseWriteGuard::FrameDrivenAnimationLeaseWriteGuard(
    std::shared_ptr<FrameDrivenAnimationLease> lease)
    : lease_(std::move(lease)), lock_(lease_->mutex_) {}

bool FrameDrivenAnimationLeaseWriteGuard::isClosed() const {
  return lease_ != nullptr && !lease_->acceptsWrites();
}

} // namespace reanimated
