#include <reanimated/LayoutAnimations/PendingNativeLayoutStarts.h>
#include <reanimated/Tools/ReanimatedSystraceSection.h>

#include <algorithm>
#include <cmath>
#include <utility>

namespace reanimated {

namespace {

using namespace native_animation;

// Host-state epsilon from the semantic contract.
constexpr double kLayoutEpsilon = 0.01;

bool layoutsMatch(const facebook::react::Rect &mounted, const facebook::react::Rect &expected) {
  return std::abs(mounted.origin.x - expected.origin.x) <= kLayoutEpsilon &&
      std::abs(mounted.origin.y - expected.origin.y) <= kLayoutEpsilon &&
      std::abs(mounted.size.width - expected.size.width) <= kLayoutEpsilon &&
      std::abs(mounted.size.height - expected.size.height) <= kLayoutEpsilon;
}

} // namespace

PendingNativeLayoutStarts::PendingNativeLayoutStarts(
    std::shared_ptr<NativeAnimationService> service,
    std::shared_ptr<LayoutMountBoundary> mountBoundary
#ifndef NDEBUG
    ,
    std::shared_ptr<NativeAnimationTraceSink> traceSink)
#else
    )
#endif
    : service_(std::move(service)),
      mountBoundary_(std::move(mountBoundary))
#ifndef NDEBUG
      ,
      traceSink_(std::move(traceSink))
#endif
{
}

void PendingNativeLayoutStarts::enqueue(PendingNativeLayoutStart record) {
  auto droppedResult = AnimationResult{AnimationOutcome::SurfaceDestroyed, AnimationResultReason::None};
  {
    std::unique_lock<std::mutex> lock(mutex_);
    if (stoppedSurfaces_.contains(record.handle.surfaceId)) {
      // droppedResult already says SurfaceDestroyed.
    } else if (!pendingHandles_.insert(record.handle).second) {
      // Handles are single-use.
      droppedResult = {AnimationOutcome::Rejected, AnimationResultReason::StaleGeneration};
    } else {
      recordNativeAnimationTrace(
          *traceSink_,
          NativeAnimationTraceEventType::MountEnqueue,
          record.handle,
          std::nullopt,
          std::nullopt,
          std::nullopt,
          6);
      pendingBySurface_[record.handle.surfaceId].push_back(std::move(record));
      return;
    }
  }
  deliverDropped(std::move(record), droppedResult);
}

void PendingNativeLayoutStarts::cancel(const AnimationHandle &handle) {
  PendingNativeLayoutStart cancelled;
  {
    std::unique_lock<std::mutex> lock(mutex_);
    const auto surfaceIt = pendingBySurface_.find(handle.surfaceId);
    if (surfaceIt == pendingBySurface_.end()) {
      return;
    }
    auto &records = surfaceIt->second;
    const auto recordIt =
        std::ranges::find_if(records, [&](const PendingNativeLayoutStart &record) { return record.handle == handle; });
    if (recordIt == records.end()) {
      return;
    }
    cancelled = std::move(*recordIt);
    records.erase(recordIt);
    if (records.empty()) {
      pendingBySurface_.erase(surfaceIt);
    }
    pendingHandles_.erase(handle);
  }
  deliverDropped(std::move(cancelled), {AnimationOutcome::Cancelled, AnimationResultReason::None});
}

void PendingNativeLayoutStarts::drainAfterMount(const facebook::react::SurfaceId surfaceId) {
  ReanimatedSystraceSection section("PendingNativeLayoutStarts::drainAfterMount");
  std::vector<PendingNativeLayoutStart> records;
  {
    std::unique_lock<std::mutex> lock(mutex_);
    const auto surfaceIt = pendingBySurface_.find(surfaceId);
    if (surfaceIt == pendingBySurface_.end()) {
      return;
    }
    records = std::move(surfaceIt->second);
    pendingBySurface_.erase(surfaceIt);
    for (const auto &record : records) {
      pendingHandles_.erase(record.handle);
    }
  }
  for (auto &record : records) {
    const auto mountedState = mountBoundary_->mountedState(surfaceId, record.handle.tag);
    if (!mountedState) {
      deliverDropped(std::move(record), {AnimationOutcome::Rejected, AnimationResultReason::TargetUnavailable});
      continue;
    }
    const bool propsAreStale = record.expectedFinalPropsToken != 0 && mountedState->propsToken != 0 &&
        mountedState->propsToken != record.expectedFinalPropsToken;
    if (propsAreStale || !layoutsMatch(mountedState->frame, record.expectedFinalLayout)) {
      // A newer commit mounted past this record's expected final state.
      deliverDropped(std::move(record), {AnimationOutcome::Rejected, AnimationResultReason::StaleGeneration});
      continue;
    }
    recordNativeAnimationTrace(
        *traceSink_,
        NativeAnimationTraceEventType::MountDrain,
        record.handle,
        std::nullopt,
        std::nullopt,
        std::nullopt,
        6);
    service_->schedule(std::move(record.request), std::move(record.callbacks));
  }
}

void PendingNativeLayoutStarts::notifySurfaceStarted(const facebook::react::SurfaceId surfaceId) {
  std::unique_lock<std::mutex> lock(mutex_);
  stoppedSurfaces_.erase(surfaceId);
}

void PendingNativeLayoutStarts::cancelSurface(const facebook::react::SurfaceId surfaceId) {
  std::vector<PendingNativeLayoutStart> records;
  {
    std::unique_lock<std::mutex> lock(mutex_);
    stoppedSurfaces_.insert(surfaceId);
    const auto surfaceIt = pendingBySurface_.find(surfaceId);
    if (surfaceIt == pendingBySurface_.end()) {
      return;
    }
    records = std::move(surfaceIt->second);
    pendingBySurface_.erase(surfaceIt);
    for (const auto &record : records) {
      pendingHandles_.erase(record.handle);
    }
  }
  for (auto &record : records) {
    deliverDropped(std::move(record), {AnimationOutcome::SurfaceDestroyed, AnimationResultReason::None});
  }
}

void PendingNativeLayoutStarts::deliverDropped(PendingNativeLayoutStart record, const AnimationResult result) const {
  recordNativeAnimationTrace(
      *traceSink_,
      NativeAnimationTraceEventType::Rejection,
      record.handle,
      std::nullopt,
      result.outcome,
      result.reason,
      6);
  recordNativeAnimationTrace(
      *traceSink_,
      NativeAnimationTraceEventType::Terminal,
      record.handle,
      std::nullopt,
      result.outcome,
      result.reason,
      6);
  auto callbacks = std::move(record.callbacks);
  if (!callbacks.onAdmission && !callbacks.onTerminal) {
    return;
  }
  auto operation =
      [admission = std::move(callbacks.onAdmission), terminal = std::move(callbacks.onTerminal), result]() mutable {
        if (admission) {
          admission({AnimationAdmissionStatus::Rejected, result.reason});
        }
        if (terminal) {
          terminal(result);
        }
      };
  if (callbacks.scheduler) {
    callbacks.scheduler(std::move(operation));
  } else {
    operation();
  }
}

} // namespace reanimated
