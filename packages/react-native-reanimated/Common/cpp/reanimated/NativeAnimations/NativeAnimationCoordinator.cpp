#include <reanimated/NativeAnimations/NativeAnimationCoordinator.h>
#include <reanimated/NativeAnimations/NativeAnimationValidation.h>
#include <reanimated/Tools/ReanimatedSystraceSection.h>

#include <react/utils/hash_combine.h>

#include <algorithm>
#include <utility>

namespace reanimated::native_animation {

namespace {

std::vector<AnimationTargetClaim> targetsFromPlan(const AnimationPlan &plan) {
  std::vector<AnimationTargetClaim> targets;
  targets.reserve(plan.tracks.size());
  for (const auto &track : plan.tracks) {
    targets.emplace_back(track.target);
  }
  return targets;
}

std::vector<AnimationTarget> collectConcreteTargets(const std::vector<AnimationTargetClaim> &claims) {
  std::vector<AnimationTarget> targets;
  for (const auto &claim : claims) {
    if (const auto *target = std::get_if<AnimationTarget>(&claim)) {
      targets.push_back(*target);
    }
  }
  return targets;
}

bool containsClaim(const std::vector<AnimationTargetClaim> &claims, const AnimationTargetClaim &target) {
  return std::ranges::find(claims, target) != claims.end();
}

bool claimSetsMatchExactly(
    const std::vector<AnimationTargetClaim> &claims,
    const std::vector<AnimationTargetClaim> &replacement) {
  if (claims.size() != replacement.size()) {
    return false;
  }
  return std::ranges::all_of(claims, [&](const AnimationTargetClaim &claim) {
    return std::holds_alternative<AnimationTarget>(claim) && std::ranges::find(replacement, claim) != replacement.end();
  });
}

void scheduleCallback(const CallbackScheduler &scheduler, CallbackOperation operation) {
  if (scheduler) {
    scheduler(std::move(operation));
  } else {
    operation();
  }
}

void runCallbacks(const std::vector<std::function<void()>> &callbacks) {
  for (auto &callback : callbacks) {
    if (callback) {
      callback();
    }
  }
}

template <typename Callback, typename Result>
void deliverResult(CallbackScheduler scheduler, Callback callback, Result result) {
  if (!callback) {
    return;
  }
  scheduleCallback(std::move(scheduler), [callback = std::move(callback), result = std::move(result)]() mutable {
    callback(std::move(result));
  });
}

void deliverHandoffResult(HandoffCallbacks callbacks, HandoffResult result) {
  deliverResult(std::move(callbacks.driver.scheduler), std::move(callbacks.onResult), std::move(result));
}

void deliverAnimationAdmission(
    CallbackScheduler scheduler,
    AnimationAdmissionCallback callback,
    const AnimationAdmissionResult result) {
  deliverResult(std::move(scheduler), std::move(callback), result);
}

void deliverExternalClaimResult(ExternalClaimCallbacks callbacks, const ExternalClaimResult result) {
  deliverResult(std::move(callbacks.driver.scheduler), std::move(callbacks.onResult), result);
}

} // namespace

size_t NativeAnimationCoordinator::GenerationKeyHash::operator()(const GenerationKey &key) const noexcept {
  return facebook::react::hash_combine(key.surfaceId, key.tag, static_cast<uint8_t>(key.owner));
}

NativeAnimationCoordinator::NativeAnimationCoordinator(
    std::shared_ptr<NativeAnimationConflictPolicy> conflictPolicy,
    std::shared_ptr<NativeAnimationTargetRegistry> targetRegistry,
    std::shared_ptr<NativeAnimationTargetResolver> targetResolver,
    std::shared_ptr<NativeAnimationExecutor> executor
#ifndef NDEBUG
    ,
    std::shared_ptr<NativeAnimationTraceSink> traceSink)
#else
    )
#endif
    : conflictPolicy_(std::move(conflictPolicy)),
      targetRegistry_(std::move(targetRegistry)),
      targetResolver_(std::move(targetResolver)),
      executor_(std::move(executor))
#ifndef NDEBUG
      ,
      traceSink_(std::move(traceSink)) {
}
#else
{
}
#endif

void NativeAnimationCoordinator::schedule(AnimationRequest request, AnimationCallbacks callbacks) {
  ReanimatedSystraceSection section("NativeAnimationCoordinator::schedule");
  const auto handle = request.handle;
  recordNativeAnimationTrace(*traceSink_, NativeAnimationTraceEventType::Schedule, handle);

  if (!usedHandles_.insert(handle).second) {
    reject(handle, std::move(callbacks), AnimationResultReason::StaleGeneration);
    return;
  }
  if (destroyedSurfaces_.contains(handle.surfaceId)) {
    reject(handle, std::move(callbacks), AnimationResultReason::TargetUnavailable);
    return;
  }
  if (targetRegistry_->hasRetainedExitGuard(handle.surfaceId, handle.tag)) {
    reject(handle, std::move(callbacks), AnimationResultReason::RetainedExitActive);
    return;
  }
  if (const auto invalidReason = validateAnimationPlan(request.plan)) {
    reject(handle, std::move(callbacks), *invalidReason);
    return;
  }
  const auto targets = targetsFromPlan(request.plan);
  if (isStaleGeneration(handle, targets)) {
    reject(handle, std::move(callbacks), AnimationResultReason::StaleGeneration);
    return;
  }

  const auto concreteTargets = collectConcreteTargets(targets);
  auto targetResolution = targetResolver_->resolveTargets(handle, concreteTargets);
  if (const auto *reason = std::get_if<AnimationResultReason>(&targetResolution)) {
    reject(handle, std::move(callbacks), *reason);
    return;
  }
  auto resolvedTargets = std::move(std::get<ResolvedAnimationTargets>(targetResolution));
  if (resolvedTargets.size() != request.plan.tracks.size()) {
    reject(handle, std::move(callbacks), AnimationResultReason::ExecutorError);
    return;
  }
  std::vector<ResolvedAnimationTrack> resolvedTracks;
  resolvedTracks.reserve(request.plan.tracks.size());
  for (size_t index = 0; index < request.plan.tracks.size(); ++index) {
    resolvedTracks.push_back(
        ResolvedAnimationTrack{std::move(request.plan.tracks[index]), std::move(resolvedTargets[index])});
  }

  auto preparation = executor_->prepare(handle, std::move(resolvedTracks));
  if (const auto *reason = std::get_if<AnimationResultReason>(&preparation)) {
    reject(handle, std::move(callbacks), *reason);
    return;
  }
  recordNativeAnimationTrace(*traceSink_, NativeAnimationTraceEventType::Validation, handle);

  const auto conflicts = targetRegistry_->conflicts(handle.surfaceId, handle.tag, targets);
  if (const auto reason = conflictDecision(handle, conflicts)) {
    reject(handle, std::move(callbacks), *reason);
    return;
  }

  auto replacement = replaceConflicts(conflicts);
  auto admissionScheduler = callbacks.scheduler;
  auto admissionCallback = std::move(callbacks.onAdmission);
  commands_.emplace(
      handle,
      CommandState{
          AnimationDriverKind::Native, targets, {}, std::move(callbacks.scheduler), std::move(callbacks.onTerminal)});
  targetRegistry_->claim(handle, AnimationDriverKind::Native, targets);
  rememberGeneration(handle, targets);
  if (request.admissionMode == AnimationAdmissionMode::RetainedExit) {
    targetRegistry_->addRetainedExitGuard(handle);
  }
  for (const auto &target : targets) {
    recordNativeAnimationTrace(*traceSink_, NativeAnimationTraceEventType::Claim, handle, target);
  }

  runCallbacks(std::move(replacement.externalRevocations));
  runCallbacks(std::move(replacement.terminalCallbacks));
  deliverAnimationAdmission(
      std::move(admissionScheduler),
      std::move(admissionCallback),
      {AnimationAdmissionStatus::Granted, AnimationResultReason::None});

  executor_->start(
      handle,
      std::move(std::get<std::unique_ptr<PreparedNativeAnimation>>(preparation)),
      replacement.interruptions,
      [weakThis = weak_from_this(), handle](const AnimationTarget target, const bool finished) {
        if (const auto strongThis = weakThis.lock()) {
          strongThis->finishTrack(handle, target, finished);
        }
      });
}

void NativeAnimationCoordinator::cancel(const AnimationHandle handle) {
  const auto commandIt = commands_.find(handle);
  if (commandIt == commands_.end()) {
    return;
  }
  if (commandIt->second.driver == AnimationDriverKind::Native) {
    executor_->cancel(handle, collectConcreteTargets(commandIt->second.targets));
  }
  auto externalRevoke = std::move(commandIt->second.externalRevoke);
  auto callback = takeTerminal(handle, {AnimationOutcome::Cancelled, AnimationResultReason::None});
  eraseCommand(handle);
  if (externalRevoke) {
    externalRevoke();
  }
  if (callback) {
    callback();
  }
}

void NativeAnimationCoordinator::handoffToExternal(
    const AnimationHandle nativeHandle,
    const ExternalClaimRequest &replacement,
    HandoffCallbacks callbacks) {
  recordNativeAnimationTrace(*traceSink_, NativeAnimationTraceEventType::Schedule, replacement.handle);
  if (!usedHandles_.insert(replacement.handle).second) {
    auto result = HandoffResult{rejectExternal(replacement.handle, AnimationResultReason::StaleGeneration), {}};
    deliverHandoffResult(std::move(callbacks), std::move(result));
    return;
  }
  if (destroyedSurfaces_.contains(replacement.handle.surfaceId)) {
    auto result = HandoffResult{rejectExternal(replacement.handle, AnimationResultReason::TargetUnavailable), {}};
    deliverHandoffResult(std::move(callbacks), std::move(result));
    return;
  }
  const auto nativeIt = commands_.find(nativeHandle);
  if (nativeIt == commands_.end() || nativeIt->second.driver != AnimationDriverKind::Native ||
      replacement.handle.surfaceId != nativeHandle.surfaceId || replacement.handle.tag != nativeHandle.tag ||
      validateExternalRequest(replacement) || !claimSetsMatchExactly(nativeIt->second.targets, replacement.targets)) {
    auto result = HandoffResult{rejectExternal(replacement.handle, AnimationResultReason::InvalidPlan), {}};
    deliverHandoffResult(std::move(callbacks), std::move(result));
    return;
  }
  if (isStaleGeneration(replacement.handle, replacement.targets)) {
    auto result = HandoffResult{rejectExternal(replacement.handle, AnimationResultReason::StaleGeneration), {}};
    deliverHandoffResult(std::move(callbacks), std::move(result));
    return;
  }
  if (targetRegistry_->hasRetainedExitGuard(replacement.handle.surfaceId, replacement.handle.tag)) {
    auto result = HandoffResult{rejectExternal(replacement.handle, AnimationResultReason::RetainedExitActive), {}};
    deliverHandoffResult(std::move(callbacks), std::move(result));
    return;
  }
  const auto conflicts = targetRegistry_->conflicts(
      replacement.handle.surfaceId, replacement.handle.tag, replacement.targets, nativeHandle);
  if (const auto reason = conflictDecision(replacement.handle, conflicts)) {
    auto result = HandoffResult{rejectExternal(replacement.handle, *reason), {}};
    deliverHandoffResult(std::move(callbacks), std::move(result));
    return;
  }
  auto captured = executor_->handoff(nativeHandle, collectConcreteTargets(nativeIt->second.targets));
  if (const auto *reason = std::get_if<AnimationResultReason>(&captured)) {
    auto result = HandoffResult{rejectExternal(replacement.handle, *reason), {}};
    deliverHandoffResult(std::move(callbacks), std::move(result));
    return;
  }
  recordNativeAnimationTrace(*traceSink_, NativeAnimationTraceEventType::Validation, replacement.handle);

  auto conflictReplacement = replaceConflicts(conflicts);
  auto nativeTerminal = takeTerminal(nativeHandle, {AnimationOutcome::Interrupted, AnimationResultReason::None});
  eraseCommand(nativeHandle);
  commands_.emplace(
      replacement.handle,
      CommandState{
          AnimationDriverKind::External,
          replacement.targets,
          std::move(callbacks.driver.onRevoke),
          callbacks.driver.scheduler,
          std::move(callbacks.driver.onTerminal)});
  targetRegistry_->claim(replacement.handle, AnimationDriverKind::External, replacement.targets);
  rememberGeneration(replacement.handle, replacement.targets);
  if (replacement.admissionMode == AnimationAdmissionMode::RetainedExit) {
    targetRegistry_->addRetainedExitGuard(replacement.handle);
  }
  for (const auto &target : replacement.targets) {
    recordNativeAnimationTrace(*traceSink_, NativeAnimationTraceEventType::Claim, replacement.handle, target);
  }
  stopNativeInterruptions(conflictReplacement.interruptions);
  runCallbacks(std::move(conflictReplacement.externalRevocations));
  runCallbacks(std::move(conflictReplacement.terminalCallbacks));
  if (nativeTerminal) {
    nativeTerminal();
  }
  auto result = HandoffResult{
      {ExternalClaimStatus::Granted, AnimationResultReason::None},
      std::move(std::get<std::vector<CapturedTargetValue>>(captured)),
  };
  deliverHandoffResult(std::move(callbacks), std::move(result));
}

void NativeAnimationCoordinator::claimExternal(const ExternalClaimRequest &request, ExternalClaimCallbacks callbacks) {
  const auto handle = request.handle;
  recordNativeAnimationTrace(*traceSink_, NativeAnimationTraceEventType::Schedule, handle);
  if (!usedHandles_.insert(handle).second) {
    const auto result = rejectExternal(handle, AnimationResultReason::StaleGeneration);
    deliverExternalClaimResult(std::move(callbacks), result);
    return;
  }
  if (destroyedSurfaces_.contains(handle.surfaceId)) {
    const auto result = rejectExternal(handle, AnimationResultReason::TargetUnavailable);
    deliverExternalClaimResult(std::move(callbacks), result);
    return;
  }
  if (const auto reason = validateExternalRequest(request)) {
    const auto result = rejectExternal(handle, *reason);
    deliverExternalClaimResult(std::move(callbacks), result);
    return;
  }
  if (isStaleGeneration(handle, request.targets)) {
    const auto result = rejectExternal(handle, AnimationResultReason::StaleGeneration);
    deliverExternalClaimResult(std::move(callbacks), result);
    return;
  }
  if (targetRegistry_->hasRetainedExitGuard(handle.surfaceId, handle.tag)) {
    const auto result = rejectExternal(handle, AnimationResultReason::RetainedExitActive);
    deliverExternalClaimResult(std::move(callbacks), result);
    return;
  }
  const auto conflicts = targetRegistry_->conflicts(handle.surfaceId, handle.tag, request.targets);
  if (const auto reason = conflictDecision(handle, conflicts)) {
    const auto result = rejectExternal(handle, *reason);
    deliverExternalClaimResult(std::move(callbacks), result);
    return;
  }
  recordNativeAnimationTrace(*traceSink_, NativeAnimationTraceEventType::Validation, handle);

  auto replacement = replaceConflicts(conflicts);
  commands_.emplace(
      handle,
      CommandState{
          AnimationDriverKind::External,
          request.targets,
          std::move(callbacks.driver.onRevoke),
          callbacks.driver.scheduler,
          std::move(callbacks.driver.onTerminal)});
  targetRegistry_->claim(handle, AnimationDriverKind::External, request.targets);
  rememberGeneration(handle, request.targets);
  if (request.admissionMode == AnimationAdmissionMode::RetainedExit) {
    targetRegistry_->addRetainedExitGuard(handle);
  }
  for (const auto &target : request.targets) {
    recordNativeAnimationTrace(*traceSink_, NativeAnimationTraceEventType::Claim, handle, target);
  }
  stopNativeInterruptions(replacement.interruptions);
  runCallbacks(std::move(replacement.externalRevocations));
  runCallbacks(std::move(replacement.terminalCallbacks));
  const ExternalClaimResult result{ExternalClaimStatus::Granted, AnimationResultReason::None};
  deliverExternalClaimResult(std::move(callbacks), result);
}

void NativeAnimationCoordinator::releaseExternal(const AnimationHandle handle, const AnimationOutcome outcome) {
  const auto it = commands_.find(handle);
  if (it == commands_.end() || it->second.driver != AnimationDriverKind::External) {
    return;
  }
  auto callback = takeTerminal(handle, {outcome, AnimationResultReason::None});
  eraseCommand(handle);
  if (callback) {
    callback();
  }
}

void NativeAnimationCoordinator::notifySurfaceStarted(const SurfaceId surfaceId) {
  destroyedSurfaces_.erase(surfaceId);
}

void NativeAnimationCoordinator::cancelSurface(const SurfaceId surfaceId) {
  destroyedSurfaces_.insert(surfaceId);
  std::vector<AnimationHandle> handles;
  std::vector<ExternalRevokeCallback> externalRevocations;
  std::vector<DeferredCallback> callbacks;
  for (const auto &[handle, command] : commands_) {
    if (handle.surfaceId == surfaceId) {
      handles.push_back(handle);
    }
  }
  for (const auto &handle : handles) {
    const auto it = commands_.find(handle);
    if (it != commands_.end() && it->second.driver == AnimationDriverKind::Native) {
      executor_->cancel(handle, collectConcreteTargets(it->second.targets));
    } else if (it != commands_.end() && it->second.externalRevoke) {
      externalRevocations.push_back(std::move(it->second.externalRevoke));
    }
    callbacks.push_back(takeTerminal(handle, {AnimationOutcome::SurfaceDestroyed, AnimationResultReason::None}));
    commands_.erase(handle);
  }
  targetRegistry_->clearSurface(surfaceId);
  std::erase_if(generationMarks_, [surfaceId](const auto &entry) { return entry.first.surfaceId == surfaceId; });
  std::erase_if(usedHandles_, [surfaceId](const AnimationHandle &handle) { return handle.surfaceId == surfaceId; });
  runCallbacks(std::move(externalRevocations));
  runCallbacks(std::move(callbacks));
}

std::optional<AnimationResultReason> NativeAnimationCoordinator::validateExternalRequest(
    const ExternalClaimRequest &request) const {
  if (request.targets.empty()) {
    return AnimationResultReason::InvalidPlan;
  }
  for (size_t index = 0; index < request.targets.size(); ++index) {
    for (size_t other = index + 1; other < request.targets.size(); ++other) {
      if (targetsConflict(request.targets[index], request.targets[other])) {
        return AnimationResultReason::InvalidPlan;
      }
    }
  }
  return std::nullopt;
}

std::optional<AnimationResultReason> NativeAnimationCoordinator::conflictDecision(
    const AnimationHandle &incoming,
    const std::vector<AnimationClaim> &conflicts) const {
  for (const auto &conflict : conflicts) {
    if (conflictPolicy_->decide(incoming, conflict.owner) == ConflictAction::Reject) {
      return AnimationResultReason::OwnershipDenied;
    }
  }
  return std::nullopt;
}

bool NativeAnimationCoordinator::isStaleGeneration(
    const AnimationHandle &handle,
    const std::vector<AnimationTargetClaim> &targets) const {
  const auto marksIt = generationMarks_.find({handle.surfaceId, handle.tag, handle.owner});
  if (marksIt == generationMarks_.end()) {
    return false;
  }
  for (const auto &target : targets) {
    for (const auto &mark : marksIt->second) {
      if (targetsConflict(target, mark.target) && handle.generation <= mark.generation) {
        return true;
      }
    }
  }
  return false;
}

void NativeAnimationCoordinator::rememberGeneration(
    const AnimationHandle &handle,
    const std::vector<AnimationTargetClaim> &targets) {
  auto &marks = generationMarks_[{handle.surfaceId, handle.tag, handle.owner}];
  for (const auto &target : targets) {
    const auto markIt = std::ranges::find(marks, target, &GenerationMark::target);
    if (markIt == marks.end()) {
      marks.push_back({target, handle.generation});
    } else {
      markIt->generation = std::max(markIt->generation, handle.generation);
    }
  }
}

NativeAnimationCoordinator::ConflictReplacement NativeAnimationCoordinator::replaceConflicts(
    const std::vector<AnimationClaim> &conflicts) {
  ConflictReplacement replacement;
  std::vector<AnimationHandle> externalOwners;
  for (const auto &conflict : conflicts) {
    auto commandIt = commands_.find(conflict.owner);
    if (commandIt == commands_.end()) {
      continue;
    }
    if (commandIt->second.driver == AnimationDriverKind::External) {
      if (std::ranges::find(externalOwners, conflict.owner) == externalOwners.end()) {
        externalOwners.push_back(conflict.owner);
      }
      continue;
    }
    const auto *target = std::get_if<AnimationTarget>(&conflict.target);
    if (target == nullptr) {
      continue;
    }
    replacement.interruptions.push_back({conflict.owner, *target});
    targetRegistry_->release(conflict.owner, {conflict.target});
    std::erase_if(commandIt->second.targets, [&](const AnimationTargetClaim &ownedTarget) {
      return ownedTarget == conflict.target;
    });
    replacement.terminalCallbacks.push_back(
        takeTerminal(conflict.owner, {AnimationOutcome::Interrupted, AnimationResultReason::None}));
    if (commandIt->second.targets.empty()) {
      commands_.erase(commandIt);
    }
  }
  for (const auto &owner : externalOwners) {
    const auto commandIt = commands_.find(owner);
    if (commandIt != commands_.end() && commandIt->second.externalRevoke) {
      replacement.externalRevocations.push_back(std::move(commandIt->second.externalRevoke));
    }
    replacement.terminalCallbacks.push_back(
        takeTerminal(owner, {AnimationOutcome::Interrupted, AnimationResultReason::None}));
    eraseCommand(owner);
  }
  return replacement;
}

void NativeAnimationCoordinator::stopNativeInterruptions(
    const std::vector<NativeTrackInterruption> &interruptions) const {
  std::unordered_map<AnimationHandle, std::vector<AnimationTarget>, AnimationHandleHash> targetsByHandle;
  for (const auto &interruption : interruptions) {
    targetsByHandle[interruption.handle].push_back(interruption.target);
  }
  for (const auto &[handle, targets] : targetsByHandle) {
    executor_->cancel(handle, targets);
  }
}

void NativeAnimationCoordinator::finishTrack(
    const AnimationHandle &handle,
    const AnimationTarget target,
    const bool finished) {
  const auto commandIt = commands_.find(handle);
  if (commandIt == commands_.end() || !containsClaim(commandIt->second.targets, AnimationTargetClaim{target})) {
    return;
  }
  targetRegistry_->release(handle, {AnimationTargetClaim{target}});
  std::erase_if(commandIt->second.targets, [&](const AnimationTargetClaim &claim) {
    return claim == AnimationTargetClaim{target};
  });
  const bool hasNoTargets = commandIt->second.targets.empty();

  DeferredCallback callback;
  if (!finished) {
    callback = takeTerminal(handle, {AnimationOutcome::Interrupted, AnimationResultReason::None});
  } else if (hasNoTargets) {
    callback = takeTerminal(handle, {AnimationOutcome::Finished, AnimationResultReason::None});
  }

  if (hasNoTargets) {
    targetRegistry_->removeRetainedExitGuard(handle);
    commands_.erase(commandIt);
  }
  if (callback) {
    callback();
  }
}

NativeAnimationCoordinator::DeferredCallback NativeAnimationCoordinator::takeTerminal(
    const AnimationHandle &handle,
    const AnimationResult result) {
  const auto it = commands_.find(handle);
  if (it == commands_.end() || it->second.terminalSent) {
    return {};
  }
  it->second.terminalSent = true;
  recordNativeAnimationTrace(
      *traceSink_, NativeAnimationTraceEventType::Terminal, handle, std::nullopt, result.outcome, result.reason);
  auto scheduler = std::move(it->second.callbackScheduler);
  auto terminal = std::move(it->second.terminal);
  if (!terminal) {
    return {};
  }
  return [scheduler = std::move(scheduler), terminal = std::move(terminal), result]() mutable {
    scheduleCallback(std::move(scheduler), [terminal = std::move(terminal), result]() mutable { terminal(result); });
  };
}

void NativeAnimationCoordinator::reject(
    const AnimationHandle &handle,
    AnimationCallbacks callbacks,
    const AnimationResultReason reason) {
  recordNativeAnimationTrace(
      *traceSink_, NativeAnimationTraceEventType::Rejection, handle, std::nullopt, AnimationOutcome::Rejected, reason);
  recordNativeAnimationTrace(
      *traceSink_, NativeAnimationTraceEventType::Terminal, handle, std::nullopt, AnimationOutcome::Rejected, reason);
  if (callbacks.onAdmission || callbacks.onTerminal) {
    scheduleCallback(
        std::move(callbacks.scheduler),
        [admission = std::move(callbacks.onAdmission), terminal = std::move(callbacks.onTerminal), reason]() mutable {
          if (admission) {
            admission({AnimationAdmissionStatus::Rejected, reason});
          }
          if (terminal) {
            terminal({AnimationOutcome::Rejected, reason});
          }
        });
  }
}

ExternalClaimResult NativeAnimationCoordinator::rejectExternal(
    const AnimationHandle &handle,
    const AnimationResultReason reason) {
  recordNativeAnimationTrace(
      *traceSink_, NativeAnimationTraceEventType::Rejection, handle, std::nullopt, AnimationOutcome::Rejected, reason);
  recordNativeAnimationTrace(
      *traceSink_, NativeAnimationTraceEventType::Terminal, handle, std::nullopt, AnimationOutcome::Rejected, reason);
  return {ExternalClaimStatus::Rejected, reason};
}

void NativeAnimationCoordinator::eraseCommand(const AnimationHandle &handle) {
  targetRegistry_->release(handle);
  commands_.erase(handle);
}

} // namespace reanimated::native_animation
