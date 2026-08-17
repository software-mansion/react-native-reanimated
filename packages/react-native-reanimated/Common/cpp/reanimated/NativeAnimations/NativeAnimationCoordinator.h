#pragma once

#include <reanimated/NativeAnimations/NativeAnimationConflictPolicy.h>
#include <reanimated/NativeAnimations/NativeAnimationInterfaces.h>
#include <reanimated/NativeAnimations/NativeAnimationTargetRegistry.h>
#include <reanimated/NativeAnimations/NativeAnimationTrace.h>

#include <memory>
#include <unordered_map>
#include <unordered_set>

namespace reanimated::native_animation {

class NativeAnimationCoordinator : public std::enable_shared_from_this<NativeAnimationCoordinator> {
 public:
  NativeAnimationCoordinator(
      std::shared_ptr<NativeAnimationConflictPolicy> conflictPolicy,
      std::shared_ptr<NativeAnimationTargetRegistry> targetRegistry,
      std::shared_ptr<NativeAnimationTargetResolver> targetResolver,
      std::shared_ptr<NativeAnimationExecutor> executor
#ifndef NDEBUG
      ,
      std::shared_ptr<NativeAnimationTraceSink> traceSink);
#else
  );
#endif

  void schedule(AnimationRequest request, AnimationCallbacks callbacks);
  void cancel(AnimationHandle handle);
  void
  handoffToExternal(AnimationHandle nativeHandle, const ExternalClaimRequest &replacement, HandoffCallbacks callbacks);
  void claimExternal(const ExternalClaimRequest &request, ExternalClaimCallbacks callbacks);
  void releaseExternal(AnimationHandle handle, AnimationOutcome outcome);
  void notifySurfaceStarted(SurfaceId surfaceId);
  void cancelSurface(SurfaceId surfaceId);

 private:
  struct CommandState {
    AnimationDriverKind driver;
    std::vector<AnimationTargetClaim> targets;
    ExternalRevokeCallback externalRevoke;
    CallbackScheduler callbackScheduler;
    TerminalCallback terminal;
    bool terminalSent{false};
  };

  using DeferredCallback = std::function<void()>;

  struct ConflictReplacement {
    std::vector<NativeTrackInterruption> interruptions;
    std::vector<ExternalRevokeCallback> externalRevocations;
    std::vector<DeferredCallback> terminalCallbacks;
  };

  struct GenerationKey {
    SurfaceId surfaceId;
    Tag tag;
    AnimationOwner owner;

    bool operator==(const GenerationKey &) const = default;
  };

  struct GenerationKeyHash {
    size_t operator()(const GenerationKey &key) const noexcept;
  };

  struct GenerationMark {
    AnimationTargetClaim target;
    uint64_t generation;
  };

  using CommandMap = std::unordered_map<AnimationHandle, CommandState, AnimationHandleHash>;

  std::optional<AnimationResultReason> validateExternalRequest(const ExternalClaimRequest &request) const;
  std::optional<AnimationResultReason> conflictDecision(
      const AnimationHandle &incoming,
      const std::vector<AnimationClaim> &conflicts) const;
  bool isStaleGeneration(const AnimationHandle &handle, const std::vector<AnimationTargetClaim> &targets) const;
  void rememberGeneration(const AnimationHandle &handle, const std::vector<AnimationTargetClaim> &targets);
  ConflictReplacement replaceConflicts(const std::vector<AnimationClaim> &conflicts);
  void stopNativeInterruptions(const std::vector<NativeTrackInterruption> &interruptions) const;
  void finishTrack(const AnimationHandle &handle, AnimationTarget target, bool finished);
  DeferredCallback takeTerminal(const AnimationHandle &handle, AnimationResult result);
  void reject(const AnimationHandle &handle, AnimationCallbacks callbacks, AnimationResultReason reason);
  ExternalClaimResult rejectExternal(const AnimationHandle &handle, AnimationResultReason reason);
  void eraseCommand(const AnimationHandle &handle);

  std::shared_ptr<NativeAnimationConflictPolicy> conflictPolicy_;
  std::shared_ptr<NativeAnimationTargetRegistry> targetRegistry_;
  std::shared_ptr<NativeAnimationTargetResolver> targetResolver_;
  std::shared_ptr<NativeAnimationExecutor> executor_;
#ifndef NDEBUG
  std::shared_ptr<NativeAnimationTraceSink> traceSink_;
#endif
  CommandMap commands_;
  // Surface teardown clears handle and generation history after it blocks later
  // work for the stopped surface.
  std::unordered_set<AnimationHandle, AnimationHandleHash> usedHandles_;
  std::unordered_map<GenerationKey, std::vector<GenerationMark>, GenerationKeyHash> generationMarks_;
  std::unordered_set<SurfaceId> destroyedSurfaces_;
};

} // namespace reanimated::native_animation
