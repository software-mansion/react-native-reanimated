#include <reanimated/NativeAnimations/NativeAnimationDispatcher.h>
#include <reanimated/Tools/ReanimatedSystraceSection.h>

#include <utility>

namespace reanimated::native_animation {

NativeAnimationDispatcher::NativeAnimationDispatcher(
    std::shared_ptr<PlatformUIScheduler> platformUIScheduler,
    std::shared_ptr<NativeAnimationCoordinator> coordinator)
    : platformUIScheduler_(std::move(platformUIScheduler)), coordinator_(std::move(coordinator)) {}

void NativeAnimationDispatcher::schedule(AnimationRequest request, AnimationCallbacks callbacks) {
  ReanimatedSystraceSection section("NativeAnimationDispatcher::schedule");
  auto coordinator = coordinator_;
  platformUIScheduler_->schedule(
      [coordinator, request = std::move(request), callbacks = std::move(callbacks)]() mutable {
        coordinator->schedule(std::move(request), std::move(callbacks));
      });
}

void NativeAnimationDispatcher::cancel(const AnimationHandle handle) {
  auto coordinator = coordinator_;
  platformUIScheduler_->schedule([coordinator, handle]() { coordinator->cancel(handle); });
}

void NativeAnimationDispatcher::handoffToExternal(
    const AnimationHandle nativeHandle,
    ExternalClaimRequest replacement,
    HandoffCallbacks callbacks) {
  auto coordinator = coordinator_;
  platformUIScheduler_->schedule(
      [coordinator, nativeHandle, replacement = std::move(replacement), callbacks = std::move(callbacks)]() mutable {
        coordinator->handoffToExternal(nativeHandle, std::move(replacement), std::move(callbacks));
      });
}

void NativeAnimationDispatcher::claimExternal(ExternalClaimRequest request, ExternalClaimCallbacks callbacks) {
  auto coordinator = coordinator_;
  platformUIScheduler_->schedule(
      [coordinator, request = std::move(request), callbacks = std::move(callbacks)]() mutable {
        coordinator->claimExternal(std::move(request), std::move(callbacks));
      });
}

void NativeAnimationDispatcher::releaseExternal(const AnimationHandle handle, const AnimationOutcome outcome) {
  auto coordinator = coordinator_;
  platformUIScheduler_->schedule([coordinator, handle, outcome]() { coordinator->releaseExternal(handle, outcome); });
}

void NativeAnimationDispatcher::notifySurfaceStarted(const SurfaceId surfaceId) {
  auto coordinator = coordinator_;
  platformUIScheduler_->schedule([coordinator, surfaceId]() { coordinator->notifySurfaceStarted(surfaceId); });
}

void NativeAnimationDispatcher::cancelSurface(const SurfaceId surfaceId) {
  auto coordinator = coordinator_;
  platformUIScheduler_->schedule([coordinator, surfaceId]() { coordinator->cancelSurface(surfaceId); });
}

} // namespace reanimated::native_animation
