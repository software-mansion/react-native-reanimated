#pragma once

#include <reanimated/NativeAnimations/NativeAnimationIdentity.h>
#include <reanimated/NativeAnimations/NativeAnimationTiming.h>
#include <reanimated/NativeAnimations/NativeAnimationValue.h>

#include <cstdint>
#include <functional>
#include <variant>
#include <vector>

namespace reanimated::native_animation {

struct AnimationKeyframe {
  double offset{0};
  AnimationValue value;
  AnimationTiming timingToNext;
};

struct AnimationTrack {
  AnimationTarget target;
  AnimationStart start;
  std::vector<AnimationKeyframe> keyframes;
  double delayMs{0};
  double durationMs{0};
};

struct AnimationPlan {
  std::vector<AnimationTrack> tracks;
};

enum class AnimationAdmissionMode : uint8_t {
  Normal,
  RetainedExit,
};

struct AnimationRequest {
  AnimationHandle handle;
  AnimationPlan plan;
  AnimationAdmissionMode admissionMode{AnimationAdmissionMode::Normal};
};

enum class TrackBuildFailureReason : uint8_t {
  UnsupportedTarget,
  UnsupportedValue,
  UnsupportedTiming,
  UnsupportedTrackForm,
  InvalidValue,
  ResourceLimit,
};

struct TrackBuildFailure {
  TrackBuildFailureReason reason;
};

using TrackBuildResult = std::variant<AnimationTrack, TrackBuildFailure>;

enum class AnimationOutcome : uint8_t {
  Finished,
  Cancelled,
  Interrupted,
  Rejected,
  SurfaceDestroyed,
};

enum class AnimationResultReason : uint8_t {
  None,
  TargetUnavailable,
  UnsupportedTargetRealization,
  CurrentValueUnavailable,
  StaleGeneration,
  InvalidPlan,
  OwnershipDenied,
  RetainedExitActive,
  ExecutorError,
  ResourceLimit,
};

struct AnimationResult {
  AnimationOutcome outcome;
  AnimationResultReason reason;

  bool operator==(const AnimationResult &) const = default;
};

using TerminalCallback = std::function<void(AnimationResult)>;
using CallbackOperation = std::function<void()>;
using CallbackScheduler = std::function<void(CallbackOperation)>;

enum class AnimationAdmissionStatus : uint8_t {
  Granted,
  Rejected,
};

struct AnimationAdmissionResult {
  AnimationAdmissionStatus status;
  AnimationResultReason reason;
};

using AnimationAdmissionCallback = std::function<void(AnimationAdmissionResult)>;

struct AnimationCallbacks {
  CallbackScheduler scheduler;
  AnimationAdmissionCallback onAdmission;
  TerminalCallback onTerminal;
};

struct ExternalClaimRequest {
  AnimationHandle handle;
  std::vector<AnimationTargetClaim> targets;
  AnimationAdmissionMode admissionMode{AnimationAdmissionMode::Normal};
};

enum class ExternalClaimStatus : uint8_t {
  Granted,
  Rejected,
};

struct ExternalClaimResult {
  ExternalClaimStatus status;
  AnimationResultReason reason;
};

struct CapturedTargetValue {
  AnimationTarget target;
  AnimationValue value;
};

struct HandoffResult {
  ExternalClaimResult claim;
  std::vector<CapturedTargetValue> currentValues;
};

using HandoffResultCallback = std::function<void(HandoffResult)>;
using ExternalClaimResultCallback = std::function<void(ExternalClaimResult)>;
// Runs in the platform UI context and must stop external writes before it returns.
using ExternalRevokeCallback = std::function<void()>;

struct ExternalDriverCallbacks {
  CallbackScheduler scheduler;
  ExternalRevokeCallback onRevoke;
  TerminalCallback onTerminal;
};

struct HandoffCallbacks {
  HandoffResultCallback onResult;
  ExternalDriverCallbacks driver;
};

struct ExternalClaimCallbacks {
  ExternalClaimResultCallback onResult;
  ExternalDriverCallbacks driver;
};

} // namespace reanimated::native_animation
