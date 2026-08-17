#pragma once

#include <reanimated/LayoutAnimations/LayoutAnimationType.h>
#include <reanimated/LayoutAnimations/LayoutMountBoundary.h>
#include <reanimated/NativeAnimations/NativeAnimationService.h>
#include <reanimated/NativeAnimations/NativeAnimationTrace.h>

#include <cstdint>
#include <memory>
#include <mutex>
#include <unordered_map>
#include <unordered_set>
#include <vector>

namespace reanimated {

// Opaque holder for the old and final ShadowView copies of a pending start.
// Keeps this store free of renderer headers.
class PendingLayoutViewSnapshot {
 public:
  virtual ~PendingLayoutViewSnapshot() = default;
};

struct PendingNativeLayoutStart {
  native_animation::AnimationHandle handle;
  // MountingTransaction::Number without its heavy header dependency.
  int64_t transactionNumber{0};
  LayoutAnimationType type{LayoutAnimationType::LAYOUT};
  facebook::react::Rect expectedFinalLayout;
  // Identity of the expected final props object; zero skips the props check.
  uintptr_t expectedFinalPropsToken{0};
  std::unique_ptr<PendingLayoutViewSnapshot> views;
  // Opaque owned execution data; this store never reads the plan.
  native_animation::AnimationRequest request;
  native_animation::AnimationCallbacks callbacks;
};

// Layout-owned store that holds prepared native requests until the mount
// boundary reports the intended Fabric mount, then validates and submits
// them. Every record gets exactly one typed result. A mutex guards the state;
// callbacks and submissions run outside of it.
class PendingNativeLayoutStarts {
 public:
  PendingNativeLayoutStarts(
      std::shared_ptr<native_animation::NativeAnimationService> service,
      std::shared_ptr<LayoutMountBoundary> mountBoundary
#ifndef NDEBUG
      ,
      std::shared_ptr<native_animation::NativeAnimationTraceSink> traceSink =
          std::make_shared<native_animation::NullNativeAnimationTraceSink>());
#else
  );
#endif

  void enqueue(PendingNativeLayoutStart record);
  // Removes one exact pending handle; disjoint newer generations stay valid.
  void cancel(const native_animation::AnimationHandle &handle);
  void drainAfterMount(facebook::react::SurfaceId surfaceId);
  void notifySurfaceStarted(facebook::react::SurfaceId surfaceId);
  void cancelSurface(facebook::react::SurfaceId surfaceId);

 private:
  void deliverDropped(PendingNativeLayoutStart record, native_animation::AnimationResult result) const;

  std::shared_ptr<native_animation::NativeAnimationService> service_;
  std::shared_ptr<LayoutMountBoundary> mountBoundary_;
#ifndef NDEBUG
  std::shared_ptr<native_animation::NativeAnimationTraceSink> traceSink_;
#endif

  mutable std::mutex mutex_;
  std::unordered_map<facebook::react::SurfaceId, std::vector<PendingNativeLayoutStart>> pendingBySurface_;
  std::unordered_set<native_animation::AnimationHandle, native_animation::AnimationHandleHash> pendingHandles_;
  std::unordered_set<facebook::react::SurfaceId> stoppedSurfaces_;
};

} // namespace reanimated
