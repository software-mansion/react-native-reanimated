#include <reanimated/LayoutAnimations/LayoutNativeAnimationAdapter.h>
#include <reanimated/NativeAnimations/NativeAnimationTargetRegistry.h>
#include <reanimated/NativeAnimations/NativeAnimationValidation.h>
#include <reanimated/NativeAnimations/testing/FakeNativeAnimationHost.h>

#include <algorithm>
#include <cassert>
#include <iostream>
#include <memory>
#include <string>
#include <vector>

using namespace reanimated::native_animation;
using namespace reanimated::native_animation::testing;

void runPendingNativeLayoutStartsTests();

namespace {

CallbackScheduler immediateScheduler() {
  return [](CallbackOperation operation) {
    operation();
  };
}

AnimationCallbacks animationCallbacks(TerminalCallback terminal = {}) {
  return {immediateScheduler(), {}, std::move(terminal)};
}

HandoffCallbacks handoffCallbacks(
    HandoffResultCallback onResult,
    TerminalCallback onTerminal = {},
    ExternalRevokeCallback onRevoke = {}) {
  return {
      std::move(onResult),
      {immediateScheduler(), std::move(onRevoke), std::move(onTerminal)},
  };
}

ExternalClaimCallbacks externalCallbacks(
    ExternalClaimResultCallback onResult,
    TerminalCallback onTerminal = {},
    ExternalRevokeCallback onRevoke = {}) {
  return {
      std::move(onResult),
      {immediateScheduler(), std::move(onRevoke), std::move(onTerminal)},
  };
}

AnimationTrack opacityTrack() {
  return {
      {AnimationTargetKind::Opacity},
      AnimationValue{0.0},
      {{1.0, AnimationValue{1.0}, LinearTiming{}}},
      0,
      100,
  };
}

AnimationTrack positionTrack() {
  return {
      {AnimationTargetKind::Position},
      AnimationValue{AnimationPoint{0, 0}},
      {{1.0, AnimationValue{AnimationPoint{10, 10}}, LinearTiming{}}},
      0,
      100,
  };
}

AnimationTrack zeroDurationOpacityTrack(const double delayMs = 0) {
  auto track = opacityTrack();
  track.delayMs = delayMs;
  track.durationMs = 0;
  return track;
}

template <typename Executor = TestNativeAnimationExecutor>
struct FixtureBase {
  std::shared_ptr<TestPlatformUIScheduler> scheduler = std::make_shared<TestPlatformUIScheduler>();
  std::shared_ptr<TestNativeAnimationTargetResolver> resolver = std::make_shared<TestNativeAnimationTargetResolver>();
  std::shared_ptr<Executor> executor = std::make_shared<Executor>();
#ifndef NDEBUG
  std::shared_ptr<TestNativeAnimationTraceRecorder> trace = std::make_shared<TestNativeAnimationTraceRecorder>();
  std::shared_ptr<NativeAnimationService> service = makeNativeAnimationService(scheduler, resolver, executor, trace);
#else
  std::shared_ptr<NativeAnimationService> service = makeNativeAnimationService(scheduler, resolver, executor);
#endif
};

using Fixture = FixtureBase<>;

void testOwnedRequestAndExactlyOnceTerminal() {
  Fixture fixture;
  const AnimationHandle handle{1, 10, AnimationOwner::Layout, 1};
  std::vector<AnimationResult> results;
  {
    AnimationRequest request{handle, {{opacityTrack()}}, AnimationAdmissionMode::Normal};
    fixture.service->schedule(
        std::move(request), animationCallbacks([&](const AnimationResult result) { results.push_back(result); }));
  }
  fixture.scheduler->flush();
  fixture.executor->complete(handle, {AnimationTargetKind::Opacity});
  fixture.executor->complete(handle, {AnimationTargetKind::Opacity});
  assert((results == std::vector<AnimationResult>{{AnimationOutcome::Finished, AnimationResultReason::None}}));

#ifndef NDEBUG
  assert(!fixture.trace->events.empty());
  uint64_t expectedSequence = 1;
  size_t terminalEvents = 0;
  for (const auto &event : fixture.trace->events) {
    assert(event.schemaVersion == NativeAnimationTraceEvent::SchemaVersion);
    assert(event.sequence == expectedSequence++);
    assert(event.monotonicTimeMs > 0);
    assert(event.handle == handle);
    assert(event.objective == 5);
    terminalEvents += event.event == NativeAnimationTraceEventType::Terminal;
  }
  assert(terminalEvents == 1);
#endif
}

void testTrackBuildAndWholePlanFallback() {
  Fixture fixture;
  reanimated::LayoutNativeAnimationAdapter adapter(fixture.service, immediateScheduler());
  auto valid = buildAnimationTrack(opacityTrack());
  auto invalidTrack = opacityTrack();
  invalidTrack.durationMs = -1;
  auto invalid = buildAnimationTrack(std::move(invalidTrack));
  assert(std::holds_alternative<AnimationTrack>(valid));
  assert(std::get<TrackBuildFailure>(invalid).reason == TrackBuildFailureReason::InvalidValue);

  std::vector<TrackBuildResult> results;
  results.push_back(std::move(valid));
  results.push_back(std::move(invalid));
  const auto plan = adapter.buildPlan(std::move(results));
  assert(std::holds_alternative<TrackBuildFailure>(plan));
}

void testProvisionalResourceLimitBoundaries() {
  auto trackAtLimit = opacityTrack();
  const auto keyframe = trackAtLimit.keyframes.front();
  trackAtLimit.keyframes.assign(4096, keyframe);
  assert(
      std::holds_alternative<AnimationTrack>(
          buildAnimationTrack(trackAtLimit)));

  trackAtLimit.keyframes.push_back(trackAtLimit.keyframes.front());
  const auto trackAboveLimit = buildAnimationTrack(std::move(trackAtLimit));
  assert(
      std::get<TrackBuildFailure>(trackAboveLimit).reason ==
      TrackBuildFailureReason::ResourceLimit);

  AnimationPlan planAtLimit;
  planAtLimit.tracks.assign(128, opacityTrack());
  assert(
      validateAnimationPlan(planAtLimit) == AnimationResultReason::InvalidPlan);

  planAtLimit.tracks.push_back(opacityTrack());
  assert(
      validateAnimationPlan(planAtLimit) ==
      AnimationResultReason::ResourceLimit);
}

void testSurfaceIdentityAndDisjointGenerations() {
  Fixture fixture;
  const AnimationHandle firstSurface{1, 10, AnimationOwner::Layout, 1};
  const AnimationHandle secondSurface{2, 10, AnimationOwner::Layout, 1};
  const AnimationHandle newerDisjoint{1, 10, AnimationOwner::Layout, 2};
  fixture.service->schedule({firstSurface, {{opacityTrack()}}, AnimationAdmissionMode::Normal}, {});
  fixture.service->schedule({secondSurface, {{opacityTrack()}}, AnimationAdmissionMode::Normal}, {});
  fixture.service->schedule({newerDisjoint, {{positionTrack()}}, AnimationAdmissionMode::Normal}, {});
  fixture.scheduler->flush();
  assert(fixture.executor->started.size() == 3);

  fixture.service->cancelSurface(1);
  fixture.scheduler->flush();
  assert(fixture.executor->active.contains(secondSurface));
  assert(!fixture.executor->active.contains(firstSurface));
  assert(!fixture.executor->active.contains(newerDisjoint));
}

void testTargetRegistryScopesClaimsAndRetainedExitsByView() {
  NativeAnimationTargetRegistry registry;
  const AnimationHandle first{1, 10, AnimationOwner::Layout, 1};
  const AnimationHandle otherTag{1, 11, AnimationOwner::Layout, 1};
  const AnimationHandle otherSurface{2, 10, AnimationOwner::Layout, 1};
  const std::vector<AnimationTargetClaim> firstTargets{
      AnimationTarget{AnimationTargetKind::Opacity},
      AnimationTarget{AnimationTargetKind::Position},
  };

  registry.claim(first, AnimationDriverKind::Native, firstTargets);
  registry.claim(otherTag, AnimationDriverKind::Native, {AnimationTarget{AnimationTargetKind::Opacity}});
  registry.claim(otherSurface, AnimationDriverKind::Native, {AnimationTarget{AnimationTargetKind::Opacity}});

  const auto conflicts =
      registry.conflicts(first.surfaceId, first.tag, {AnimationTarget{AnimationTargetKind::Opacity}});
  assert(conflicts.size() == 1);
  assert(conflicts.front().owner == first);
  assert(registry.claimsFor(first).size() == 2);

  registry.release(first, {AnimationTarget{AnimationTargetKind::Opacity}});
  assert(registry.claimsFor(first).size() == 1);

  registry.addRetainedExitGuard(first);
  registry.addRetainedExitGuard(otherTag);
  registry.addRetainedExitGuard(otherSurface);
  assert(registry.hasRetainedExitGuard(first.surfaceId, first.tag));
  assert(!registry.hasRetainedExitGuard(first.surfaceId, 12));
  registry.removeRetainedExitGuard(first);
  assert(!registry.hasRetainedExitGuard(first.surfaceId, first.tag));

  registry.clearSurface(1);
  assert(registry.claimsFor(first).empty());
  assert(registry.claimsFor(otherTag).empty());
  assert(registry.claimsFor(otherSurface).size() == 1);
  assert(registry.hasRetainedExitGuard(otherSurface.surfaceId, otherSurface.tag));
}

void testMultiTrackCommandUsesOneBatchResolution() {
  Fixture fixture;
  const AnimationHandle handle{1, 10, AnimationOwner::Layout, 1};
  fixture.service->schedule({handle, {{opacityTrack(), positionTrack()}}, AnimationAdmissionMode::Normal}, {});
  fixture.scheduler->flush();

  assert(fixture.resolver->resolveCallCount == 1);
  assert(fixture.resolver->resolvedTargetCount == 2);
}

void testOverlapAndWildcardClaims() {
  Fixture fixture;
  const AnimationHandle external{1, 10, AnimationOwner::Layout, 1};
  bool granted = false;
  fixture.service->claimExternal(
      {external, {AllVisualTargets{}}, AnimationAdmissionMode::Normal},
      externalCallbacks(
          [&](const ExternalClaimResult result) { granted = result.status == ExternalClaimStatus::Granted; }));
  fixture.scheduler->flush();
  assert(granted);

  const AnimationHandle css{1, 10, AnimationOwner::CSSTransition, 2};
  std::vector<AnimationResult> results;
  fixture.service->schedule({css, {{opacityTrack()}}, AnimationAdmissionMode::Normal},
                            animationCallbacks([&](const auto result) { results.push_back(result); }));
  fixture.scheduler->flush();
  assert(
      (results == std::vector<AnimationResult>{{AnimationOutcome::Rejected, AnimationResultReason::OwnershipDenied}}));

  assert(
      targetsConflict(AnimationTarget{AnimationTargetKind::Position}, AnimationTarget{AnimationTargetKind::PositionX}));
  assert(!targetsConflict(AnimationTarget{AnimationTargetKind::PositionX},
                          AnimationTarget{AnimationTargetKind::PositionY}));
  assert(targetsConflict(AnimationTarget{AnimationTargetKind::Size}, AnimationTarget{AnimationTargetKind::Width}));
  assert(!targetsConflict(AnimationTarget{AnimationTargetKind::Width}, AnimationTarget{AnimationTargetKind::Height}));
}

void testResolvedRejectionChangesNoClaim() {
  Fixture fixture;
  const AnimationHandle oldHandle{1, 10, AnimationOwner::Layout, 1};
  const AnimationHandle rejectedHandle{1, 10, AnimationOwner::Layout, 2};
  fixture.service->schedule({oldHandle, {{opacityTrack()}}, AnimationAdmissionMode::Normal}, {});
  fixture.scheduler->flush();
  fixture.resolver->rejectedTargets.insert(AnimationTargetKind::Opacity);
  std::vector<AnimationResult> results;
  fixture.service->schedule({rejectedHandle, {{opacityTrack()}}, AnimationAdmissionMode::Normal},
                            animationCallbacks([&](const auto result) { results.push_back(result); }));
  fixture.scheduler->flush();
  assert(fixture.executor->active.contains(oldHandle));
  assert(fixture.executor->interrupted.empty());
  assert(results.front().reason == AnimationResultReason::UnsupportedTargetRealization);
}

void testAdmissionReportsBeforeStartOrRejectionTerminal() {
  Fixture acceptedFixture;
  bool granted = false;
  acceptedFixture.executor->onStart = [&](const AnimationHandle &) { assert(granted); };
  acceptedFixture.service->schedule(
      {{1, 10, AnimationOwner::Layout, 1}, {{opacityTrack()}}, AnimationAdmissionMode::Normal},
      {
          immediateScheduler(),
          [&](const AnimationAdmissionResult result) {
            granted = result.status == AnimationAdmissionStatus::Granted;
          },
          {},
      });
  acceptedFixture.scheduler->flush();
  assert(granted);

  Fixture rejectedFixture;
  rejectedFixture.resolver->rejectedTargets.insert(AnimationTargetKind::Opacity);
  std::vector<std::string> callbackOrder;
  rejectedFixture.service->schedule(
      {{1, 10, AnimationOwner::Layout, 1}, {{opacityTrack()}}, AnimationAdmissionMode::Normal},
      {
          immediateScheduler(),
          [&](const AnimationAdmissionResult result) {
            assert(result.status == AnimationAdmissionStatus::Rejected);
            callbackOrder.emplace_back("admission");
          },
          [&](const AnimationResult result) {
            assert(result.outcome == AnimationOutcome::Rejected);
            callbackOrder.emplace_back("terminal");
          },
      });
  rejectedFixture.scheduler->flush();
  assert((callbackOrder == std::vector<std::string>{"admission", "terminal"}));
}

void testCancelAndHandoffDiffer() {
  Fixture fixture;
  const AnimationHandle cancelled{1, 10, AnimationOwner::Layout, 1};
  fixture.service->schedule({cancelled, {{opacityTrack()}}, AnimationAdmissionMode::Normal}, {});
  fixture.scheduler->flush();
  fixture.service->cancel(cancelled);
  fixture.scheduler->flush();
  assert(fixture.executor->cancelled.size() == 1);

  const AnimationHandle native{1, 10, AnimationOwner::Layout, 2};
  const AnimationHandle external{1, 10, AnimationOwner::Layout, 3};
  fixture.service->schedule({native, {{opacityTrack()}}, AnimationAdmissionMode::Normal}, {});
  fixture.scheduler->flush();
  std::optional<HandoffResult> handoff;
  fixture.service->handoffToExternal(
      native,
      {external, {AnimationTarget{AnimationTargetKind::Opacity}}, AnimationAdmissionMode::Normal},
      handoffCallbacks([&](HandoffResult result) { handoff = std::move(result); }));
  fixture.scheduler->flush();
  assert(handoff && handoff->claim.status == ExternalClaimStatus::Granted);
  assert(handoff->currentValues.size() == 1);
  assert(fixture.executor->cancelled.size() == 1);
}

void testLateOverlappingGenerationIsRejected() {
  Fixture fixture;
  const AnimationHandle newer{1, 10, AnimationOwner::Layout, 2};
  fixture.service->schedule({newer, {{opacityTrack()}}, AnimationAdmissionMode::Normal}, {});
  fixture.scheduler->flush();
  fixture.executor->complete(newer, {AnimationTargetKind::Opacity});

  std::optional<AnimationResult> staleResult;
  fixture.service->schedule({{1, 10, AnimationOwner::Layout, 1}, {{opacityTrack()}}, AnimationAdmissionMode::Normal},
                            animationCallbacks([&](const AnimationResult result) { staleResult = result; }));
  fixture.service->schedule({{1, 10, AnimationOwner::Layout, 1}, {{positionTrack()}}, AnimationAdmissionMode::Normal},
                            {});
  fixture.scheduler->flush();

  assert(staleResult && staleResult->outcome == AnimationOutcome::Rejected);
  assert(staleResult->reason == AnimationResultReason::StaleGeneration);
  assert(fixture.executor->started.size() == 1);
}

void testCompletedHandleCannotBeReused() {
  Fixture fixture;
  const AnimationHandle handle{1, 10, AnimationOwner::Layout, 1};
  fixture.service->schedule({handle, {{opacityTrack()}}, AnimationAdmissionMode::Normal}, {});
  fixture.scheduler->flush();
  fixture.executor->complete(handle, {AnimationTargetKind::Opacity});

  std::optional<AnimationResult> result;
  fixture.service->schedule(
      {handle, {{positionTrack()}}, AnimationAdmissionMode::Normal},
      animationCallbacks([&](const AnimationResult value) { result = value; }));
  fixture.scheduler->flush();

  assert((result == AnimationResult{AnimationOutcome::Rejected, AnimationResultReason::StaleGeneration}));
  assert(fixture.executor->started.size() == 1);
}

void testRejectedHandoffPreservesNativeCommand() {
  Fixture fixture;
  const AnimationHandle native{1, 10, AnimationOwner::Layout, 1};
  const AnimationHandle occupiedReplacement{1, 10, AnimationOwner::Layout, 2};
  fixture.service->schedule({native, {{opacityTrack()}}, AnimationAdmissionMode::Normal}, {});
  fixture.service->schedule({occupiedReplacement, {{positionTrack()}}, AnimationAdmissionMode::Normal}, {});
  fixture.scheduler->flush();

  std::optional<HandoffResult> duplicateResult;
  fixture.service->handoffToExternal(
      native,
      {occupiedReplacement, {AnimationTarget{AnimationTargetKind::Opacity}}, AnimationAdmissionMode::Normal},
      handoffCallbacks([&](HandoffResult result) { duplicateResult = std::move(result); }));
  fixture.scheduler->flush();
  assert(duplicateResult && duplicateResult->claim.status == ExternalClaimStatus::Rejected);
  assert(duplicateResult->claim.reason == AnimationResultReason::StaleGeneration);
  assert(fixture.executor->active.contains(native));

  const AnimationHandle external{1, 10, AnimationOwner::Layout, 3};
  fixture.executor->handoffFailure = AnimationResultReason::CurrentValueUnavailable;
  std::optional<HandoffResult> captureFailure;
  fixture.service->handoffToExternal(
      native,
      {external, {AnimationTarget{AnimationTargetKind::Opacity}}, AnimationAdmissionMode::Normal},
      handoffCallbacks([&](HandoffResult result) { captureFailure = std::move(result); }));
  fixture.scheduler->flush();
  assert(captureFailure && captureFailure->claim.status == ExternalClaimStatus::Rejected);
  assert(captureFailure->claim.reason == AnimationResultReason::CurrentValueUnavailable);
  assert(fixture.executor->active.contains(native));
}

void testExternalLeaseStopsBeforeReplacementStarts() {
  Fixture fixture;
  const AnimationHandle external{1, 10, AnimationOwner::Layout, 1};
  std::vector<CallbackOperation> domainQueue;
  bool leaseGranted = false;
  bool externalStopped = false;
  bool externalWritesStarted = false;
  bool terminalDelivered = false;
  fixture.service->claimExternal(
      {external, {AnimationTarget{AnimationTargetKind::Opacity}}, AnimationAdmissionMode::Normal},
      {
          [&](const ExternalClaimResult result) {
            leaseGranted = result.status == ExternalClaimStatus::Granted;
            if (leaseGranted && !externalStopped) {
              externalWritesStarted = true;
            }
          },
          {
              [&](CallbackOperation operation) { domainQueue.push_back(std::move(operation)); },
              [&]() { externalStopped = true; },
              [&](const AnimationResult result) {
                assert(result.outcome == AnimationOutcome::Interrupted);
                terminalDelivered = true;
              },
          },
      });
  fixture.scheduler->flush();
  assert(!leaseGranted);
  assert(domainQueue.size() == 1);

  fixture.executor->onStart = [&](const AnimationHandle &) {
    assert(externalStopped);
  };
  const AnimationHandle replacement{1, 10, AnimationOwner::Layout, 2};
  fixture.service->schedule({replacement, {{opacityTrack()}}, AnimationAdmissionMode::Normal}, {});
  fixture.scheduler->flush();
  assert(externalStopped);
  assert(!terminalDelivered);
  assert(domainQueue.size() == 2);
  for (auto &operation : domainQueue) {
    operation();
  }
  assert(leaseGranted);
  assert(!externalWritesStarted);
  assert(terminalDelivered);
  assert(fixture.executor->active.contains(replacement));
}

void testExternalClaimStopsNativeTracksBeforeGrant() {
  Fixture fixture;
  const AnimationHandle native{1, 10, AnimationOwner::CSSTransition, 1};
  fixture.service->schedule({native, {{opacityTrack()}}, AnimationAdmissionMode::Normal}, {});
  fixture.scheduler->flush();

  const AnimationHandle external{1, 10, AnimationOwner::Layout, 1};
  bool granted = false;
  fixture.service->claimExternal(
      {external, {AllVisualTargets{}}, AnimationAdmissionMode::Normal},
      externalCallbacks([&](const ExternalClaimResult result) {
        assert(!fixture.executor->active.contains(native));
        assert(!fixture.executor->cancelled.empty());
        granted = result.status == ExternalClaimStatus::Granted;
      }));
  fixture.scheduler->flush();

  assert(granted);
}

void testCallbacksCanReenterTheService() {
  Fixture fixture;
  const AnimationHandle first{1, 10, AnimationOwner::Layout, 1};
  const AnimationHandle second{1, 10, AnimationOwner::Layout, 2};
  fixture.service->schedule(
      {first, {{opacityTrack()}}, AnimationAdmissionMode::Normal},
      animationCallbacks([&](const AnimationResult result) {
        assert(result.outcome == AnimationOutcome::Finished);
        fixture.service->schedule({second, {{positionTrack()}}, AnimationAdmissionMode::Normal}, {});
      }));
  fixture.scheduler->flush();
  fixture.executor->complete(first, {AnimationTargetKind::Opacity});
  fixture.scheduler->flush();

  assert(fixture.executor->active.contains(second));
}

void testHandoffLeaseCanBeRevoked() {
  Fixture fixture;
  const AnimationHandle native{1, 10, AnimationOwner::CSSTransition, 1};
  const AnimationHandle external{1, 10, AnimationOwner::CSSTransition, 2};
  fixture.service->schedule({native, {{opacityTrack()}}, AnimationAdmissionMode::Normal}, {});
  fixture.scheduler->flush();

  bool granted = false;
  bool revoked = false;
  bool terminalDelivered = false;
  fixture.service->handoffToExternal(
      native,
      {external, {AnimationTarget{AnimationTargetKind::Opacity}}, AnimationAdmissionMode::Normal},
      handoffCallbacks(
          [&](HandoffResult result) { granted = result.claim.status == ExternalClaimStatus::Granted; },
          [&](const AnimationResult result) {
            assert(result.outcome == AnimationOutcome::Interrupted);
            terminalDelivered = true;
          },
          [&]() { revoked = true; }));
  fixture.scheduler->flush();
  assert(granted);

  fixture.executor->onStart = [&](const AnimationHandle &) { assert(revoked); };
  const AnimationHandle replacement{1, 10, AnimationOwner::Layout, 1};
  fixture.service->schedule({replacement, {{opacityTrack()}}, AnimationAdmissionMode::Normal}, {});
  fixture.scheduler->flush();
  assert(revoked);
  assert(terminalDelivered);
}

void testHandoffRequiresTheSameTargets() {
  Fixture fixture;
  const AnimationHandle native{1, 10, AnimationOwner::Layout, 1};
  const AnimationHandle external{1, 10, AnimationOwner::Layout, 2};
  fixture.service->schedule({native, {{opacityTrack()}}, AnimationAdmissionMode::Normal}, {});
  fixture.scheduler->flush();

  std::optional<HandoffResult> result;
  fixture.service->handoffToExternal(
      native,
      {external, {AnimationTarget{AnimationTargetKind::Position}}, AnimationAdmissionMode::Normal},
      handoffCallbacks([&](HandoffResult value) { result = std::move(value); }));
  fixture.scheduler->flush();

  assert(result && result->claim.status == ExternalClaimStatus::Rejected);
  assert(result->claim.reason == AnimationResultReason::InvalidPlan);
  assert(fixture.executor->active.contains(native));
}

void testPartialNativeReplacementKeepsOtherTracks() {
  Fixture fixture;
  const AnimationHandle oldHandle{1, 10, AnimationOwner::Layout, 1};
  const AnimationHandle replacement{1, 10, AnimationOwner::Layout, 2};
  std::vector<AnimationResult> oldResults;
  fixture.service->schedule(
      {oldHandle, {{opacityTrack(), positionTrack()}}, AnimationAdmissionMode::Normal},
      animationCallbacks([&](const AnimationResult result) { oldResults.push_back(result); }));
  fixture.scheduler->flush();

  fixture.service->schedule({replacement, {{opacityTrack()}}, AnimationAdmissionMode::Normal}, {});
  fixture.scheduler->flush();

  assert((oldResults == std::vector<AnimationResult>{{AnimationOutcome::Interrupted, AnimationResultReason::None}}));
  assert(fixture.executor->active.contains(oldHandle));
  assert((fixture.executor->active.at(oldHandle).targets ==
          std::vector<AnimationTarget>{{AnimationTargetKind::Position}}));
  fixture.executor->complete(oldHandle, {AnimationTargetKind::Position});
  assert(oldResults.size() == 1);
}

void testExternalClaimCancelsOnlyConflictingPhysicalTracks() {
  Fixture fixture;
  const AnimationHandle native{1, 10, AnimationOwner::CSSTransition, 1};
  fixture.service->schedule(
      {native, {{opacityTrack(), positionTrack()}}, AnimationAdmissionMode::Normal}, {});
  fixture.scheduler->flush();

  const AnimationHandle external{1, 10, AnimationOwner::Layout, 1};
  fixture.service->claimExternal(
      {external, {AnimationTarget{AnimationTargetKind::Opacity}}, AnimationAdmissionMode::Normal},
      externalCallbacks(
          [](const ExternalClaimResult result) { assert(result.status == ExternalClaimStatus::Granted); }));
  fixture.scheduler->flush();

  assert(fixture.executor->active.contains(native));
  assert((fixture.executor->active.at(native).targets ==
          std::vector<AnimationTarget>{{AnimationTargetKind::Position}}));

  fixture.executor->complete(native, AnimationTarget{AnimationTargetKind::Position});
  assert(!fixture.executor->active.contains(native));
}

void testZeroDurationCompletesWithoutAnActiveTrack() {
  Fixture fixture;
  const AnimationHandle handle{1, 10, AnimationOwner::Layout, 1};
  std::optional<AnimationResult> result;
  fixture.service->schedule(
      {handle, {{zeroDurationOpacityTrack()}}, AnimationAdmissionMode::Normal},
      animationCallbacks([&](const AnimationResult value) { result = value; }));
  fixture.scheduler->flush();

  assert((result == AnimationResult{AnimationOutcome::Finished, AnimationResultReason::None}));
  assert(!fixture.executor->active.contains(handle));
  assert(fixture.executor->zeroDuration.size() == 1);
}

void testZeroDurationKeepsItsDeclaredDelay() {
  Fixture fixture;
  const AnimationHandle handle{1, 10, AnimationOwner::Layout, 1};
  std::optional<AnimationResult> result;
  fixture.service->schedule(
      {handle, {{zeroDurationOpacityTrack(40)}}, AnimationAdmissionMode::Normal},
      animationCallbacks([&](const AnimationResult value) { result = value; }));
  fixture.scheduler->flush();

  // The plan accepts the positive delay, ownership resolves, and the delay
  // reaches the executor unchanged. The wait itself is platform behavior.
  assert((result == AnimationResult{AnimationOutcome::Finished, AnimationResultReason::None}));
  assert(fixture.executor->zeroDuration.size() == 1);
  assert(fixture.executor->zeroDuration.front().delayMs == 40);
  assert(!fixture.executor->active.contains(handle));
}

void testStoppedTrackUsesAnInterruptionResult() {
  Fixture fixture;
  const AnimationHandle handle{1, 10, AnimationOwner::Layout, 1};
  std::optional<AnimationResult> result;
  fixture.service->schedule(
      {handle, {{opacityTrack()}}, AnimationAdmissionMode::Normal},
      animationCallbacks([&](const AnimationResult value) { result = value; }));
  fixture.scheduler->flush();
  fixture.executor->complete(handle, {AnimationTargetKind::Opacity}, false);

  assert((result == AnimationResult{AnimationOutcome::Interrupted, AnimationResultReason::None}));
}

void testCallbacksUseTheSelectedScheduler() {
  Fixture fixture;
  std::vector<CallbackOperation> domainQueue;
  const AnimationHandle handle{1, 10, AnimationOwner::Layout, 1};
  bool completed = false;
  fixture.service->schedule(
      {handle, {{opacityTrack()}}, AnimationAdmissionMode::Normal},
      {
          [&](CallbackOperation operation) { domainQueue.push_back(std::move(operation)); },
          {},
          [&](const AnimationResult) { completed = true; },
      });
  fixture.scheduler->flush();
  fixture.executor->complete(handle, {AnimationTargetKind::Opacity});
  assert(!completed);
  assert(domainQueue.size() == 1);
  domainQueue.front()();
  assert(completed);
}

void testRetainedExitAndSurfaceTeardown() {
  Fixture fixture;
  const AnimationHandle retained{1, 10, AnimationOwner::Layout, 1};
  const AnimationHandle otherSurface{2, 10, AnimationOwner::Layout, 1};
  std::optional<AnimationResult> retainedTerminal;
  fixture.service->claimExternal(
      {retained, {AllVisualTargets{}}, AnimationAdmissionMode::RetainedExit},
      externalCallbacks(
          [](const ExternalClaimResult) {}, [&](const AnimationResult result) { retainedTerminal = result; }));
  fixture.service->schedule({otherSurface, {{opacityTrack()}}, AnimationAdmissionMode::Normal}, {});
  fixture.scheduler->flush();

  std::optional<AnimationResult> rejected;
  fixture.service->schedule({{1, 10, AnimationOwner::Layout, 2}, {{opacityTrack()}}, AnimationAdmissionMode::Normal},
                            animationCallbacks([&](const AnimationResult result) { rejected = result; }));
  fixture.scheduler->flush();
  assert(rejected && rejected->reason == AnimationResultReason::RetainedExitActive);

  fixture.service->cancelSurface(1);
  fixture.scheduler->flush();
  assert(retainedTerminal && retainedTerminal->outcome == AnimationOutcome::SurfaceDestroyed);
  assert(fixture.executor->active.contains(otherSurface));

  std::optional<AnimationResult> staleSurface;
  fixture.service->schedule({{1, 11, AnimationOwner::Layout, 1}, {{opacityTrack()}}, AnimationAdmissionMode::Normal},
                            animationCallbacks([&](const AnimationResult result) { staleSurface = result; }));
  fixture.scheduler->flush();
  assert(staleSurface && staleSurface->reason == AnimationResultReason::TargetUnavailable);
}

void testReusedSurfaceStartsAfterTeardown() {
  Fixture fixture;
  const AnimationHandle handle{1, 10, AnimationOwner::Layout, 1};
  fixture.service->schedule({handle, {{opacityTrack()}}, AnimationAdmissionMode::Normal}, {});
  fixture.scheduler->flush();

  fixture.service->cancelSurface(handle.surfaceId);
  fixture.scheduler->flush();

  std::optional<AnimationResult> stoppedSurfaceResult;
  fixture.service->schedule(
      {{1, 11, AnimationOwner::Layout, 1}, {{opacityTrack()}}, AnimationAdmissionMode::Normal},
      animationCallbacks([&](const AnimationResult result) { stoppedSurfaceResult = result; }));
  fixture.scheduler->flush();
  assert(stoppedSurfaceResult && stoppedSurfaceResult->reason == AnimationResultReason::TargetUnavailable);

  fixture.service->notifySurfaceStarted(handle.surfaceId);
  fixture.service->schedule({handle, {{opacityTrack()}}, AnimationAdmissionMode::Normal}, {});
  fixture.scheduler->flush();

  assert(fixture.executor->started.size() == 2);
  assert(fixture.executor->active.contains(handle));
}

void testRetainedExitRejectsEveryTargetShape() {
  Fixture fixture;
  const AnimationHandle retained{1, 10, AnimationOwner::Layout, 1};
  fixture.service->claimExternal(
      {retained, {AnimationTarget{AnimationTargetKind::Opacity}}, AnimationAdmissionMode::RetainedExit},
      externalCallbacks([](const ExternalClaimResult result) {
        assert(result.status == ExternalClaimStatus::Granted);
      }));
  fixture.scheduler->flush();

  std::vector<AnimationResultReason> reasons;
  fixture.service->schedule(
      {{1, 10, AnimationOwner::Layout, 2}, {{opacityTrack()}}, AnimationAdmissionMode::Normal},
      animationCallbacks([&](const AnimationResult result) { reasons.push_back(result.reason); }));
  fixture.service->schedule(
      {{1, 10, AnimationOwner::Layout, 3}, {{positionTrack()}}, AnimationAdmissionMode::Normal},
      animationCallbacks([&](const AnimationResult result) { reasons.push_back(result.reason); }));
  fixture.service->claimExternal(
      {{1, 10, AnimationOwner::Layout, 4}, {AllVisualTargets{}}, AnimationAdmissionMode::Normal},
      externalCallbacks([&](const ExternalClaimResult result) { reasons.push_back(result.reason); }));
  fixture.scheduler->flush();

  assert(reasons.size() == 3);
  assert(std::ranges::all_of(reasons, [](const AnimationResultReason reason) {
    return reason == AnimationResultReason::RetainedExitActive;
  }));
}

template <typename Executor>
void runCommonFixtureForPlatformExecutor() {
  FixtureBase<Executor> fixture;
  const AnimationHandle handle{1, 10, AnimationOwner::Layout, 1};
  std::optional<AnimationResult> result;
  fixture.service->schedule(
      {handle, {{opacityTrack()}}, AnimationAdmissionMode::Normal},
      animationCallbacks([&](const AnimationResult value) { result = value; }));
  fixture.scheduler->flush();
  fixture.executor->complete(handle, {AnimationTargetKind::Opacity});
  assert((result == AnimationResult{AnimationOutcome::Finished, AnimationResultReason::None}));
}

void testCommonFixturesUseAppleAndAndroidExecutors() {
  runCommonFixtureForPlatformExecutor<TestAppleNativeAnimationExecutor>();
  runCommonFixtureForPlatformExecutor<TestAndroidNativeAnimationExecutor>();
}

void testExternalTraceEnvelope() {
#ifndef NDEBUG
  Fixture fixture;
  const AnimationHandle handle{1, 10, AnimationOwner::Layout, 1};
  fixture.service->claimExternal(
      {handle, {AnimationTarget{AnimationTargetKind::Opacity}}, AnimationAdmissionMode::Normal},
      externalCallbacks(
          [](const ExternalClaimResult result) { assert(result.status == ExternalClaimStatus::Granted); }));
  fixture.scheduler->flush();
  fixture.service->releaseExternal(handle, AnimationOutcome::Finished);
  fixture.scheduler->flush();

  size_t schedules = 0;
  size_t validations = 0;
  size_t claims = 0;
  size_t terminals = 0;
  for (const auto &event : fixture.trace->events) {
    schedules += event.event == NativeAnimationTraceEventType::Schedule;
    validations += event.event == NativeAnimationTraceEventType::Validation;
    claims += event.event == NativeAnimationTraceEventType::Claim;
    terminals += event.event == NativeAnimationTraceEventType::Terminal;
  }
  assert(schedules == 1);
  assert(validations == 1);
  assert(claims == 1);
  assert(terminals == 1);
#endif
}

} // namespace

int main() {
  testOwnedRequestAndExactlyOnceTerminal();
  testTrackBuildAndWholePlanFallback();
  testProvisionalResourceLimitBoundaries();
  testSurfaceIdentityAndDisjointGenerations();
  testTargetRegistryScopesClaimsAndRetainedExitsByView();
  testMultiTrackCommandUsesOneBatchResolution();
  testOverlapAndWildcardClaims();
  testResolvedRejectionChangesNoClaim();
  testAdmissionReportsBeforeStartOrRejectionTerminal();
  testCancelAndHandoffDiffer();
  testLateOverlappingGenerationIsRejected();
  testCompletedHandleCannotBeReused();
  testRejectedHandoffPreservesNativeCommand();
  testExternalLeaseStopsBeforeReplacementStarts();
  testExternalClaimStopsNativeTracksBeforeGrant();
  testCallbacksCanReenterTheService();
  testHandoffLeaseCanBeRevoked();
  testHandoffRequiresTheSameTargets();
  testPartialNativeReplacementKeepsOtherTracks();
  testExternalClaimCancelsOnlyConflictingPhysicalTracks();
  testZeroDurationCompletesWithoutAnActiveTrack();
  testZeroDurationKeepsItsDeclaredDelay();
  testStoppedTrackUsesAnInterruptionResult();
  testCallbacksUseTheSelectedScheduler();
  testRetainedExitAndSurfaceTeardown();
  testReusedSurfaceStartsAfterTeardown();
  testRetainedExitRejectsEveryTargetShape();
  testCommonFixturesUseAppleAndAndroidExecutors();
  testExternalTraceEnvelope();
  std::cout << "NativeAnimationServiceTest passed\n";
  runPendingNativeLayoutStartsTests();
}
