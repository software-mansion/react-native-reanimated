#pragma once

#include <reanimated/NativeAnimations/NativeAnimationCoordinator.h>
#include <reanimated/NativeAnimations/NativeAnimationService.h>

#include <memory>

namespace reanimated::native_animation {

class NativeAnimationDispatcher final : public NativeAnimationService {
 public:
  NativeAnimationDispatcher(
      std::shared_ptr<PlatformUIScheduler> platformUIScheduler,
      std::shared_ptr<NativeAnimationCoordinator> coordinator);

  void schedule(AnimationRequest request, AnimationCallbacks callbacks) override;
  void cancel(AnimationHandle handle) override;
  void handoffToExternal(AnimationHandle nativeHandle, ExternalClaimRequest replacement, HandoffCallbacks callbacks)
      override;
  void claimExternal(ExternalClaimRequest request, ExternalClaimCallbacks callbacks) override;
  void releaseExternal(AnimationHandle handle, AnimationOutcome outcome) override;
  void notifySurfaceStarted(SurfaceId surfaceId) override;
  void cancelSurface(SurfaceId surfaceId) override;

 private:
  std::shared_ptr<PlatformUIScheduler> platformUIScheduler_;
  std::shared_ptr<NativeAnimationCoordinator> coordinator_;
};

} // namespace reanimated::native_animation
