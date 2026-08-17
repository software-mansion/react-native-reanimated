#include <reanimated/LayoutAnimations/PendingNativeLayoutStarts.h>
#include <reanimated/NativeAnimations/testing/FakeNativeAnimationHost.h>

#include <cassert>
#include <iostream>
#include <map>
#include <memory>
#include <optional>
#include <utility>
#include <vector>

// Objective 06 pending-start tests, driven with controlled prepared requests.

void runPendingNativeLayoutStartsTests();

namespace {

using namespace reanimated;
using namespace reanimated::native_animation;
using namespace reanimated::native_animation::testing;

class FakeLayoutMountBoundary final : public LayoutMountBoundary {
 public:
  void setPostMountObserver(PostMountObserver observer) override {
    observer_ = std::move(observer);
  }

  std::optional<MountedViewState> mountedState(
      const facebook::react::SurfaceId surfaceId,
      const facebook::react::Tag tag) override {
    const auto it = mountedStates.find({surfaceId, tag});
    if (it == mountedStates.end()) {
      return std::nullopt;
    }
    return it->second;
  }

  void simulateMount(const facebook::react::SurfaceId surfaceId) {
    assert(observer_ && "the pending store must register a post-mount observer");
    observer_(surfaceId);
  }

  bool hasObserver() const {
    return observer_ != nullptr;
  }

  std::map<std::pair<facebook::react::SurfaceId, facebook::react::Tag>, MountedViewState> mountedStates;

 private:
  PostMountObserver observer_;
};

facebook::react::Rect rect(const double x, const double y, const double width, const double height) {
  facebook::react::Rect result;
  result.origin.x = x;
  result.origin.y = y;
  result.size.width = width;
  result.size.height = height;
  return result;
}

AnimationTrack pendingOpacityTrack() {
  return {
      {AnimationTargetKind::Opacity},
      AnimationValue{0.0},
      {{1.0, AnimationValue{1.0}, LinearTiming{}}},
      0,
      100,
  };
}

AnimationTrack pendingPositionTrack() {
  return {
      {AnimationTargetKind::Position},
      AnimationValue{AnimationPoint{0, 0}},
      {{1.0, AnimationValue{AnimationPoint{10, 10}}, LinearTiming{}}},
      0,
      100,
  };
}

struct RecordedResults {
  std::vector<AnimationAdmissionResult> admissions;
  std::vector<AnimationResult> terminals;
};

AnimationCallbacks recordingCallbacks(RecordedResults &results) {
  return {
      [](CallbackOperation operation) { operation(); },
      [&results](const AnimationAdmissionResult result) { results.admissions.push_back(result); },
      [&results](const AnimationResult result) { results.terminals.push_back(result); },
  };
}

struct PendingFixture {
  std::shared_ptr<TestPlatformUIScheduler> scheduler = std::make_shared<TestPlatformUIScheduler>();
  std::shared_ptr<TestNativeAnimationTargetResolver> resolver = std::make_shared<TestNativeAnimationTargetResolver>();
  std::shared_ptr<TestNativeAnimationExecutor> executor = std::make_shared<TestNativeAnimationExecutor>();
#ifndef NDEBUG
  std::shared_ptr<TestNativeAnimationTraceRecorder> trace = std::make_shared<TestNativeAnimationTraceRecorder>();
  std::shared_ptr<NativeAnimationService> service = makeNativeAnimationService(scheduler, resolver, executor, trace);
#else
  std::shared_ptr<NativeAnimationService> service = makeNativeAnimationService(scheduler, resolver, executor);
#endif
  std::shared_ptr<FakeLayoutMountBoundary> boundary = std::make_shared<FakeLayoutMountBoundary>();
#ifndef NDEBUG
  std::shared_ptr<PendingNativeLayoutStarts> pendingStarts =
      std::make_shared<PendingNativeLayoutStarts>(service, boundary, trace);
#else
  std::shared_ptr<PendingNativeLayoutStarts> pendingStarts =
      std::make_shared<PendingNativeLayoutStarts>(service, boundary);
#endif

  PendingFixture() {
    boundary->setPostMountObserver([pendingStarts = std::weak_ptr<PendingNativeLayoutStarts>(pendingStarts)](
                                       const facebook::react::SurfaceId surfaceId) {
      if (const auto lockedPendingStarts = pendingStarts.lock()) {
        lockedPendingStarts->drainAfterMount(surfaceId);
      }
    });
  }

  PendingNativeLayoutStart makeRecord(
      const AnimationHandle handle,
      const facebook::react::Rect expectedFinalLayout,
      RecordedResults &results,
      AnimationTrack track,
      const int64_t transactionNumber = 1,
      const uintptr_t expectedFinalPropsToken = 0) {
    std::vector<AnimationTrack> tracks;
    tracks.push_back(std::move(track));
    return {
        handle,
        transactionNumber,
        LayoutAnimationType::LAYOUT,
        expectedFinalLayout,
        expectedFinalPropsToken,
        nullptr,
        {handle, {std::move(tracks)}, AnimationAdmissionMode::Normal},
        recordingCallbacks(results),
    };
  }
};

void testOwnedRequestLifetimeAndMountOrdering() {
  PendingFixture fixture;
  const AnimationHandle handle{1, 10, AnimationOwner::Layout, 1};
  RecordedResults results;
  fixture.boundary->mountedStates[{1, 10}] = {rect(0, 0, 100, 50)};
  {
    auto record = fixture.makeRecord(handle, rect(0, 0, 100, 50), results, pendingOpacityTrack());
    fixture.pendingStarts->enqueue(std::move(record));
  }

  // No start before the mount signal.
  assert(fixture.executor->started.empty());
  fixture.scheduler->flush();
  assert(fixture.executor->started.empty());

  fixture.boundary->simulateMount(1);
  fixture.scheduler->flush();
  assert(fixture.executor->started.size() == 1);
  assert(fixture.executor->started.front() == handle);
  assert(results.admissions.size() == 1);
  assert(results.admissions.front().status == AnimationAdmissionStatus::Granted);

  fixture.executor->complete(handle, {AnimationTargetKind::Opacity});
  fixture.executor->complete(handle, {AnimationTargetKind::Opacity});
  assert((results.terminals == std::vector<AnimationResult>{{AnimationOutcome::Finished, AnimationResultReason::None}}));

#ifndef NDEBUG
  // Trace order: enqueue < drain < schedule.
  std::optional<uint64_t> enqueueSequence;
  std::optional<uint64_t> drainSequence;
  std::optional<uint64_t> scheduleSequence;
  for (const auto &event : fixture.trace->events) {
    if (event.event == NativeAnimationTraceEventType::MountEnqueue) {
      assert(event.objective == 6);
      enqueueSequence = event.sequence;
    } else if (event.event == NativeAnimationTraceEventType::MountDrain) {
      assert(event.objective == 6);
      drainSequence = event.sequence;
    } else if (event.event == NativeAnimationTraceEventType::Schedule) {
      scheduleSequence = event.sequence;
    }
  }
  assert(enqueueSequence && drainSequence && scheduleSequence);
  assert(*enqueueSequence < *drainSequence);
  assert(*drainSequence < *scheduleSequence);
#endif
}

void testMissingViewCannotStart() {
  PendingFixture fixture;
  const AnimationHandle handle{1, 10, AnimationOwner::Layout, 1};
  RecordedResults results;
  fixture.pendingStarts->enqueue(fixture.makeRecord(handle, rect(0, 0, 100, 50), results, pendingOpacityTrack()));

  fixture.boundary->simulateMount(1);
  fixture.scheduler->flush();
  assert(fixture.executor->started.empty());
  assert(results.admissions.size() == 1);
  assert(results.admissions.front().status == AnimationAdmissionStatus::Rejected);
  assert(
      (results.terminals ==
       std::vector<AnimationResult>{{AnimationOutcome::Rejected, AnimationResultReason::TargetUnavailable}}));
}

void testStaleFinalLayoutCannotStart() {
  PendingFixture fixture;
  const AnimationHandle handle{1, 10, AnimationOwner::Layout, 1};
  RecordedResults results;
  fixture.boundary->mountedStates[{1, 10}] = {rect(40, 40, 100, 50)};
  fixture.pendingStarts->enqueue(fixture.makeRecord(handle, rect(0, 0, 100, 50), results, pendingOpacityTrack()));

  fixture.boundary->simulateMount(1);
  fixture.scheduler->flush();
  assert(fixture.executor->started.empty());
  assert(
      (results.terminals ==
       std::vector<AnimationResult>{{AnimationOutcome::Rejected, AnimationResultReason::StaleGeneration}}));
}

void testCancelledPendingStartCannotStart() {
  PendingFixture fixture;
  const AnimationHandle handle{1, 10, AnimationOwner::Layout, 1};
  RecordedResults results;
  fixture.boundary->mountedStates[{1, 10}] = {rect(0, 0, 100, 50)};
  fixture.pendingStarts->enqueue(fixture.makeRecord(handle, rect(0, 0, 100, 50), results, pendingOpacityTrack()));

  fixture.pendingStarts->cancel(handle);
  assert((results.terminals == std::vector<AnimationResult>{{AnimationOutcome::Cancelled, AnimationResultReason::None}}));

  fixture.boundary->simulateMount(1);
  fixture.scheduler->flush();
  assert(fixture.executor->started.empty());
  assert(results.terminals.size() == 1);
}

void testNewerDisjointGenerationKeepsPendingStartValid() {
  PendingFixture fixture;
  const AnimationHandle pendingHandle{1, 10, AnimationOwner::Layout, 1};
  const AnimationHandle disjointHandle{1, 10, AnimationOwner::Layout, 2};
  RecordedResults results;
  fixture.boundary->mountedStates[{1, 10}] = {rect(0, 0, 100, 50)};
  fixture.pendingStarts->enqueue(
      fixture.makeRecord(pendingHandle, rect(0, 0, 100, 50), results, pendingOpacityTrack()));

  std::vector<AnimationTrack> disjointTracks;
  disjointTracks.push_back(pendingPositionTrack());
  fixture.service->schedule({disjointHandle, {std::move(disjointTracks)}, AnimationAdmissionMode::Normal}, {});
  fixture.scheduler->flush();
  assert(fixture.executor->started.size() == 1);

  fixture.boundary->simulateMount(1);
  fixture.scheduler->flush();
  assert(fixture.executor->started.size() == 2);
  assert(fixture.executor->started.back() == pendingHandle);
  assert(results.admissions.size() == 1);
  assert(results.admissions.front().status == AnimationAdmissionStatus::Granted);
}

void testNewerSameTargetGenerationRejectsOlderPendingStart() {
  PendingFixture fixture;
  const AnimationHandle pendingHandle{1, 10, AnimationOwner::Layout, 1};
  const AnimationHandle newerHandle{1, 10, AnimationOwner::Layout, 2};
  RecordedResults results;
  fixture.boundary->mountedStates[{1, 10}] = {rect(0, 0, 100, 50)};
  fixture.pendingStarts->enqueue(
      fixture.makeRecord(pendingHandle, rect(0, 0, 100, 50), results, pendingOpacityTrack()));

  std::vector<AnimationTrack> newerTracks;
  newerTracks.push_back(pendingOpacityTrack());
  fixture.service->schedule({newerHandle, {std::move(newerTracks)}, AnimationAdmissionMode::Normal}, {});
  fixture.scheduler->flush();
  assert(fixture.executor->started.size() == 1);

  fixture.boundary->simulateMount(1);
  fixture.scheduler->flush();
  assert(fixture.executor->started.size() == 1);
  assert(
      (results.terminals ==
       std::vector<AnimationResult>{{AnimationOutcome::Rejected, AnimationResultReason::StaleGeneration}}));
}

void testBackToBackCommitsKeepNewestFinalState() {
  PendingFixture fixture;
  const AnimationHandle firstHandle{1, 10, AnimationOwner::Layout, 1};
  const AnimationHandle secondHandle{1, 10, AnimationOwner::Layout, 2};
  RecordedResults firstResults;
  RecordedResults secondResults;

  // A -> B and B -> C queue before any mount; the platform mounts C.
  fixture.pendingStarts->enqueue(
      fixture.makeRecord(firstHandle, rect(0, 0, 100, 50), firstResults, pendingOpacityTrack(), 1));
  fixture.pendingStarts->enqueue(
      fixture.makeRecord(secondHandle, rect(200, 0, 100, 50), secondResults, pendingOpacityTrack(), 2));
  fixture.boundary->mountedStates[{1, 10}] = {rect(200, 0, 100, 50)};

  fixture.boundary->simulateMount(1);
  fixture.scheduler->flush();

  assert(
      (firstResults.terminals ==
       std::vector<AnimationResult>{{AnimationOutcome::Rejected, AnimationResultReason::StaleGeneration}}));
  assert(fixture.executor->started.size() == 1);
  assert(fixture.executor->started.front() == secondHandle);
  assert(secondResults.terminals.empty());
  fixture.executor->complete(secondHandle, {AnimationTargetKind::Opacity});
  assert(
      (secondResults.terminals == std::vector<AnimationResult>{{AnimationOutcome::Finished, AnimationResultReason::None}}));
}

void testSecondCommitRetargetsStartedCommand() {
  PendingFixture fixture;
  const AnimationHandle firstHandle{1, 10, AnimationOwner::Layout, 1};
  const AnimationHandle secondHandle{1, 10, AnimationOwner::Layout, 2};
  RecordedResults firstResults;
  RecordedResults secondResults;

  fixture.boundary->mountedStates[{1, 10}] = {rect(0, 0, 100, 50)};
  fixture.pendingStarts->enqueue(
      fixture.makeRecord(firstHandle, rect(0, 0, 100, 50), firstResults, pendingOpacityTrack(), 1));
  fixture.boundary->simulateMount(1);
  fixture.scheduler->flush();
  assert(fixture.executor->started.size() == 1);

  fixture.boundary->mountedStates[{1, 10}] = {rect(200, 0, 100, 50)};
  fixture.pendingStarts->enqueue(
      fixture.makeRecord(secondHandle, rect(200, 0, 100, 50), secondResults, pendingOpacityTrack(), 2));
  fixture.boundary->simulateMount(1);
  fixture.scheduler->flush();

  assert(fixture.executor->started.size() == 2);
  assert(
      (firstResults.terminals ==
       std::vector<AnimationResult>{{AnimationOutcome::Interrupted, AnimationResultReason::None}}));
  assert(secondResults.terminals.empty());
}

void testDuplicatePendingHandleIsRejectedAtEnqueue() {
  PendingFixture fixture;
  const AnimationHandle handle{1, 10, AnimationOwner::Layout, 1};
  RecordedResults firstResults;
  RecordedResults duplicateResults;
  fixture.boundary->mountedStates[{1, 10}] = {rect(0, 0, 100, 50)};
  fixture.pendingStarts->enqueue(fixture.makeRecord(handle, rect(0, 0, 100, 50), firstResults, pendingOpacityTrack()));
  fixture.pendingStarts->enqueue(
      fixture.makeRecord(handle, rect(0, 0, 100, 50), duplicateResults, pendingOpacityTrack()));

  assert(
      (duplicateResults.terminals ==
       std::vector<AnimationResult>{{AnimationOutcome::Rejected, AnimationResultReason::StaleGeneration}}));

  fixture.boundary->simulateMount(1);
  fixture.scheduler->flush();
  assert(fixture.executor->started.size() == 1);
  assert(firstResults.terminals.empty());
  assert(duplicateResults.terminals.size() == 1);
}

void testStaleMountedPropsCannotStart() {
  PendingFixture fixture;
  const AnimationHandle staleHandle{1, 10, AnimationOwner::Layout, 1};
  const AnimationHandle currentHandle{1, 11, AnimationOwner::Layout, 2};
  RecordedResults staleResults;
  RecordedResults currentResults;
  fixture.boundary->mountedStates[{1, 10}] = {rect(0, 0, 100, 50), 7};
  fixture.boundary->mountedStates[{1, 11}] = {rect(0, 0, 100, 50), 9};
  fixture.pendingStarts->enqueue(
      fixture.makeRecord(staleHandle, rect(0, 0, 100, 50), staleResults, pendingOpacityTrack(), 1, 8));
  fixture.pendingStarts->enqueue(
      fixture.makeRecord(currentHandle, rect(0, 0, 100, 50), currentResults, pendingOpacityTrack(), 1, 9));

  fixture.boundary->simulateMount(1);
  fixture.scheduler->flush();
  assert(
      (staleResults.terminals ==
       std::vector<AnimationResult>{{AnimationOutcome::Rejected, AnimationResultReason::StaleGeneration}}));
  assert(fixture.executor->started.size() == 1);
  assert(fixture.executor->started.front() == currentHandle);
  assert(currentResults.terminals.empty());
}

void testSurfaceIsolation() {
  PendingFixture fixture;
  const AnimationHandle firstSurfaceHandle{1, 10, AnimationOwner::Layout, 1};
  const AnimationHandle secondSurfaceHandle{2, 20, AnimationOwner::Layout, 1};
  RecordedResults firstResults;
  RecordedResults secondResults;
  fixture.boundary->mountedStates[{1, 10}] = {rect(0, 0, 100, 50)};
  fixture.boundary->mountedStates[{2, 20}] = {rect(0, 0, 100, 50)};
  fixture.pendingStarts->enqueue(
      fixture.makeRecord(firstSurfaceHandle, rect(0, 0, 100, 50), firstResults, pendingOpacityTrack()));
  fixture.pendingStarts->enqueue(
      fixture.makeRecord(secondSurfaceHandle, rect(0, 0, 100, 50), secondResults, pendingOpacityTrack()));

  fixture.boundary->simulateMount(1);
  fixture.scheduler->flush();
  assert(fixture.executor->started.size() == 1);
  assert(fixture.executor->started.front() == firstSurfaceHandle);

  fixture.boundary->simulateMount(2);
  fixture.scheduler->flush();
  assert(fixture.executor->started.size() == 2);
  assert(fixture.executor->started.back() == secondSurfaceHandle);
}

void testSurfaceTeardownBlocksQueuedStarts() {
  PendingFixture fixture;
  const AnimationHandle stoppedHandle{1, 10, AnimationOwner::Layout, 1};
  const AnimationHandle liveHandle{2, 20, AnimationOwner::Layout, 1};
  RecordedResults stoppedResults;
  RecordedResults liveResults;
  fixture.boundary->mountedStates[{1, 10}] = {rect(0, 0, 100, 50)};
  fixture.boundary->mountedStates[{2, 20}] = {rect(0, 0, 100, 50)};
  fixture.pendingStarts->enqueue(
      fixture.makeRecord(stoppedHandle, rect(0, 0, 100, 50), stoppedResults, pendingOpacityTrack()));
  fixture.pendingStarts->enqueue(fixture.makeRecord(liveHandle, rect(0, 0, 100, 50), liveResults, pendingOpacityTrack()));

  fixture.pendingStarts->cancelSurface(1);
  assert(
      (stoppedResults.terminals ==
       std::vector<AnimationResult>{{AnimationOutcome::SurfaceDestroyed, AnimationResultReason::None}}));

  fixture.boundary->simulateMount(1);
  fixture.scheduler->flush();
  assert(fixture.executor->started.empty());

  RecordedResults lateResults;
  fixture.pendingStarts->enqueue(
      fixture.makeRecord({1, 11, AnimationOwner::Layout, 2}, rect(0, 0, 100, 50), lateResults, pendingOpacityTrack()));
  assert(
      (lateResults.terminals ==
       std::vector<AnimationResult>{{AnimationOutcome::SurfaceDestroyed, AnimationResultReason::None}}));

  fixture.boundary->simulateMount(2);
  fixture.scheduler->flush();
  assert(fixture.executor->started.size() == 1);
  assert(fixture.executor->started.front() == liveHandle);

  fixture.pendingStarts->notifySurfaceStarted(1);
  RecordedResults restartedResults;
  const AnimationHandle restartedHandle{1, 12, AnimationOwner::Layout, 3};
  fixture.boundary->mountedStates[{1, 12}] = {rect(0, 0, 100, 50)};
  fixture.pendingStarts->enqueue(
      fixture.makeRecord(restartedHandle, rect(0, 0, 100, 50), restartedResults, pendingOpacityTrack()));
  fixture.boundary->simulateMount(1);
  fixture.scheduler->flush();
  assert(fixture.executor->started.size() == 2);
  assert(fixture.executor->started.back() == restartedHandle);
}

} // namespace

void runPendingNativeLayoutStartsTests() {
  testOwnedRequestLifetimeAndMountOrdering();
  testMissingViewCannotStart();
  testStaleFinalLayoutCannotStart();
  testCancelledPendingStartCannotStart();
  testNewerDisjointGenerationKeepsPendingStartValid();
  testNewerSameTargetGenerationRejectsOlderPendingStart();
  testDuplicatePendingHandleIsRejectedAtEnqueue();
  testStaleMountedPropsCannotStart();
  testBackToBackCommitsKeepNewestFinalState();
  testSecondCommitRetargetsStartedCommand();
  testSurfaceIsolation();
  testSurfaceTeardownBlocksQueuedStarts();
  std::cout << "PendingNativeLayoutStartsTest passed\n";
}
