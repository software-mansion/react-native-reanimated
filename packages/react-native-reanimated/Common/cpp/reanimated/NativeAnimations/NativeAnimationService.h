#pragma once

#include <reanimated/NativeAnimations/NativeAnimationTypes.h>

namespace reanimated::native_animation {

// Callers can use this dispatcher from any thread. It owns all request and
// callback data before it crosses the platform scheduler boundary. The
// coordinator, policy, registry, resolver, and executor then run in one
// serialized platform UI context without a second normal thread hop.
//
// Each callback group supplies the scheduler for its domain. The coordinator
// completes its state changes before it sends callback work to that scheduler.
// External callback groups also supply a synchronous revoke hook. The
// coordinator uses it to stop external writes before replacement playback.
// Shared requests store only owned C++ data. They never keep JSI data or a
// borrowed platform object across a mount boundary.
//
// A handle is single-use. Handoff accepts only the native command's exact
// target set. The coordinator records admission before native start. A revoke
// can run before a queued grant or handoff result, so the adapter must not
// start external writes after revocation. A physical stop after native start
// produces an Interrupted result.
// Surface teardown rejects later work for that surface id until
// notifySurfaceStarted announces a new surface instance. This also supports
// reused surface ids.
// Admission is callback-based. A nested platform operation waits until the
// active platform operation ends.
class NativeAnimationService {
 public:
  virtual ~NativeAnimationService() = default;

  virtual void schedule(AnimationRequest request, AnimationCallbacks callbacks) = 0;
  virtual void cancel(AnimationHandle handle) = 0;
  virtual void
  handoffToExternal(AnimationHandle nativeHandle, ExternalClaimRequest replacement, HandoffCallbacks callbacks) = 0;
  virtual void claimExternal(ExternalClaimRequest request, ExternalClaimCallbacks callbacks) = 0;
  virtual void releaseExternal(AnimationHandle handle, AnimationOutcome outcome) = 0;
  virtual void notifySurfaceStarted(SurfaceId surfaceId) = 0;
  virtual void cancelSurface(SurfaceId surfaceId) = 0;
};

} // namespace reanimated::native_animation
