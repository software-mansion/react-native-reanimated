#ifndef NDEBUG

#include <reanimated/NativeAnimations/NativeAnimationTrace.h>

#include <chrono>
#include <utility>

namespace reanimated::native_animation {

std::string_view toString(const TraceEventType event) {
  switch (event) {
    case TraceEventType::Received:
      return "Received";
    case TraceEventType::Admitted:
      return "Admitted";
    case TraceEventType::TrackStarted:
      return "TrackStarted";
    case TraceEventType::TrackEnded:
      return "TrackEnded";
    case TraceEventType::Ended:
      return "Ended";
    case TraceEventType::SurfaceClosed:
      return "SurfaceClosed";
  }
}

std::string_view toString(const AnimationOwner owner) {
  switch (owner) {
    case AnimationOwner::Layout:
      return "Layout";
    case AnimationOwner::CSSTransition:
      return "CSSTransition";
    case AnimationOwner::CSSAnimation:
      return "CSSAnimation";
  }
}

std::string_view toString(const AnimationTarget target) {
  switch (target) {
    case AnimationTarget::Opacity:
      return "Opacity";
    case AnimationTarget::Position:
      return "Position";
    case AnimationTarget::PositionX:
      return "PositionX";
    case AnimationTarget::PositionY:
      return "PositionY";
    case AnimationTarget::Size:
      return "Size";
    case AnimationTarget::Width:
      return "Width";
    case AnimationTarget::Height:
      return "Height";
    case AnimationTarget::BackgroundColor:
      return "BackgroundColor";
    case AnimationTarget::BorderColor:
      return "BorderColor";
    case AnimationTarget::BorderRadius:
      return "BorderRadius";
    case AnimationTarget::ShadowColor:
      return "ShadowColor";
    case AnimationTarget::ShadowOpacity:
      return "ShadowOpacity";
    case AnimationTarget::ShadowRadius:
      return "ShadowRadius";
    case AnimationTarget::ShadowOffset:
      return "ShadowOffset";
  }
}

std::string_view toString(const EndpointPolicy policy) {
  switch (policy) {
    case EndpointPolicy::MountedModelMustMatchEndpoint:
      return "MountedModelMustMatchEndpoint";
    case EndpointPolicy::ExecutorCommitsEndpoint:
      return "ExecutorCommitsEndpoint";
    case EndpointPolicy::HoldWithoutCommit:
      return "HoldWithoutCommit";
  }
}

std::string_view toString(const AnimationOutcome outcome) {
  switch (outcome) {
    case AnimationOutcome::Finished:
      return "Finished";
    case AnimationOutcome::Cancelled:
      return "Cancelled";
    case AnimationOutcome::Interrupted:
      return "Interrupted";
    case AnimationOutcome::Rejected:
      return "Rejected";
    case AnimationOutcome::SurfaceDestroyed:
      return "SurfaceDestroyed";
  }
}

std::string_view toString(const AnimationResultReason reason) {
  switch (reason) {
    case AnimationResultReason::None:
      return "None";
    case AnimationResultReason::InvalidPlan:
      return "InvalidPlan";
    case AnimationResultReason::StaleIdentity:
      return "StaleIdentity";
    case AnimationResultReason::TargetUnavailable:
      return "TargetUnavailable";
    case AnimationResultReason::UnsupportedRealization:
      return "UnsupportedRealization";
    case AnimationResultReason::CurrentValueUnavailable:
      return "CurrentValueUnavailable";
    case AnimationResultReason::EndpointMismatch:
      return "EndpointMismatch";
    case AnimationResultReason::OwnershipDenied:
      return "OwnershipDenied";
    case AnimationResultReason::PlatformRemoved:
      return "PlatformRemoved";
  }
}

void TraceRecorder::record(TraceEvent event) {
  const auto now = std::chrono::steady_clock::now().time_since_epoch();
  event.sequence = ++sequence_;
  event.monotonicTimeMs = std::chrono::duration<double, std::milli>(now).count();
  if (events_.size() == Capacity) {
    events_.pop_front();
  }
  events_.push_back(event);
}

std::vector<TraceEvent> TraceRecorder::take() {
  std::vector<TraceEvent> events(events_.begin(), events_.end());
  events_.clear();
  return events;
}

} // namespace reanimated::native_animation

#endif // NDEBUG
