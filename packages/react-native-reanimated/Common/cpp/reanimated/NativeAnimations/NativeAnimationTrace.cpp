#ifndef NDEBUG

#include <reanimated/NativeAnimations/NativeAnimationTrace.h>

#include <chrono>

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
    case TraceEventType::LayoutStartPending:
      return "LayoutStartPending";
    case TraceEventType::LayoutStartMounted:
      return "LayoutStartMounted";
    case TraceEventType::FrameUpdateMounted:
      return "FrameUpdateMounted";
    case TraceEventType::ClientAdmitted:
      return "ClientAdmitted";
    case TraceEventType::ClientEnded:
      return "ClientEnded";
    case TraceEventType::LayoutBuildFailed:
      return "LayoutBuildFailed";
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

std::optional<AnimationTarget> targetFromString(const std::string_view name) {
  using enum AnimationTarget;
  for (const auto target :
       {Opacity,
        Position,
        PositionX,
        PositionY,
        Size,
        Width,
        Height,
        BackgroundColor,
        BorderColor,
        BorderRadius,
        ShadowColor,
        ShadowOpacity,
        ShadowRadius,
        ShadowOffset}) {
    if (toString(target) == name) {
      return target;
    }
  }
  return std::nullopt;
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

std::string_view toString(const TrackBuildFailure failure) {
  switch (failure) {
    case TrackBuildFailure::UnsupportedTarget:
      return "UnsupportedTarget";
    case TrackBuildFailure::UnsupportedValue:
      return "UnsupportedValue";
    case TrackBuildFailure::UnsupportedTiming:
      return "UnsupportedTiming";
    case TrackBuildFailure::UnsupportedTrackForm:
      return "UnsupportedTrackForm";
    case TrackBuildFailure::InvalidValue:
      return "InvalidValue";
    case TrackBuildFailure::EndpointMismatch:
      return "EndpointMismatch";
    case TrackBuildFailure::ResourceLimit:
      return "ResourceLimit";
  }
}

double TraceRecorder::now() {
  return std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now().time_since_epoch()).count();
}

void TraceRecorder::record(TraceEvent event) {
  event.sequence = ++sequence_;
  event.monotonicTimeMs = now();
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
