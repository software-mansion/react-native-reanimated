#pragma once

#include <reanimated/NativeAnimations/NativeAnimationTypes.h>

#include <atomic>
#include <memory>
#include <mutex>
#include <vector>

namespace reanimated {

class FrameDrivenAnimationLeaseWriteGuard;

// One external lease of the shared service for the frame-driven writer of a
// view. The lease keeps the claimed targets and admission mode, so the domain
// can reuse it for a later start that needs no wider claim.
class FrameDrivenAnimationLease {
 public:
  FrameDrivenAnimationLease(
      native_animation::AnimationHandle handle,
      std::vector<native_animation::AnimationTargetClaim> targets,
      native_animation::AnimationAdmissionMode admissionMode);

  const native_animation::AnimationHandle &getHandle() const;
  const std::vector<native_animation::AnimationTargetClaim> &getTargets() const;
  native_animation::AnimationAdmissionMode getAdmissionMode() const;
  bool covers(
      const std::vector<native_animation::AnimationTargetClaim> &targets,
      native_animation::AnimationAdmissionMode admissionMode) const;

  void revoke();
  bool isRevoked() const;

  // The domain closes the gate while a native request takes over the writer
  // and opens it again when a later frame-driven start joins the lease.
  void suspendWrites();
  void resumeWrites();
  bool acceptsWrites() const;

  // A superseded lease is replaced by a wider lease of the same writer. Its
  // terminal result must not end the writer.
  void setSuperseded(bool superseded);
  bool isSuperseded() const;

 private:
  friend class FrameDrivenAnimationLeaseWriteGuard;

  native_animation::AnimationHandle handle_;
  std::vector<native_animation::AnimationTargetClaim> targets_;
  native_animation::AnimationAdmissionMode admissionMode_;
  std::recursive_mutex mutex_;
  std::atomic<bool> revoked_{false};
  std::atomic<bool> suspended_{false};
  bool superseded_{false};
};

class FrameDrivenAnimationLeaseWriteGuard {
 public:
  FrameDrivenAnimationLeaseWriteGuard() = default;
  explicit FrameDrivenAnimationLeaseWriteGuard(std::shared_ptr<FrameDrivenAnimationLease> lease);

  bool isClosed() const;

 private:
  // Keep the lease alive until after the mutex is unlocked.
  std::shared_ptr<FrameDrivenAnimationLease> lease_;
  std::unique_lock<std::recursive_mutex> lock_;
};

} // namespace reanimated
