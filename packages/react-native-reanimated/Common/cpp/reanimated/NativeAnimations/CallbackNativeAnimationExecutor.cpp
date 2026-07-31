#include <reanimated/NativeAnimations/CallbackNativeAnimationExecutor.h>
#include <reanimated/NativeAnimations/NativeAnimationCompilation.h>

#include <algorithm>
#include <utility>
#include <variant>
#include <vector>

namespace reanimated {

CallbackNativeAnimationExecutor::CallbackNativeAnimationExecutor(
    RunNativeLayoutAnimation runNativeLayoutAnimation,
    CancelNativeLayoutAnimation cancelNativeLayoutAnimation)
    : runNativeLayoutAnimation_(std::move(runNativeLayoutAnimation)),
      cancelNativeLayoutAnimation_(std::move(cancelNativeLayoutAnimation)) {}

CallbackNativeAnimationExecutor::~CallbackNativeAnimationExecutor() {
  std::vector<NativeAnimationCompletion> completions;
  completions.reserve(active_.size());
  for (auto &[_, active] : active_) {
    active.cancellationToken->store(true, std::memory_order_release);
    completions.push_back(std::move(active.completion));
  }
  active_.clear();
  for (auto &completion : completions) {
    completion({NativeAnimationOutcome::Rejected, NativeAnimationResultReason::MissingExecutor});
  }
}

NativeAnimationCapabilityReport CallbackNativeAnimationExecutor::queryCapabilities(
    const NativeAnimationPlan &plan) const {
  if (!runNativeLayoutAnimation_) {
    return {NativeAnimationCapabilityReason::MissingExecutor};
  }
  if (!validateNativeAnimationPlan(plan).native()) {
    return {NativeAnimationCapabilityReason::InvalidPlan};
  }
  for (const auto &track : plan.tracks) {
    const bool directTimingTarget = track.target == NativeAnimationTarget::Opacity ||
        track.target == NativeAnimationTarget::OriginX || track.target == NativeAnimationTarget::OriginY ||
        track.target == NativeAnimationTarget::Position;
    if (plan.route != NativeAnimationRoute::Sampled && !directTimingTarget) {
      return {NativeAnimationCapabilityReason::UnsupportedTarget};
    }
    for (const auto &segment : track.segments) {
      const auto supportedValue = [target = track.target](const NativeValue &value) {
        return std::holds_alternative<double>(value) ||
            (target == NativeAnimationTarget::Position && std::holds_alternative<NativePoint>(value)) ||
            (target == NativeAnimationTarget::Transform && std::holds_alternative<NativeMatrix4>(value));
      };
      const bool supportedValues = std::visit(
          [&supportedValue](const auto &typedSegment) {
            using T = std::decay_t<decltype(typedSegment)>;
            if constexpr (std::is_same_v<T, NativeTimingSegment>) {
              return supportedValue(typedSegment.from) && supportedValue(typedSegment.to);
            } else if constexpr (std::is_same_v<T, NativeHoldSegment>) {
              return supportedValue(typedSegment.value);
            } else {
              return std::all_of(typedSegment.values.begin(), typedSegment.values.end(), supportedValue);
            }
          },
          segment);
      if (!supportedValues) {
        return {NativeAnimationCapabilityReason::UnsupportedValueType};
      }
    }
  }
  return {NativeAnimationCapabilityReason::Supported};
}

void CallbackNativeAnimationExecutor::schedule(
    NativeAnimationHandle handle,
    NativeAnimationPlan plan,
    NativeAnimationCompletion completion) {
  if (!runNativeLayoutAnimation_) {
    completion({NativeAnimationOutcome::Rejected, NativeAnimationResultReason::MissingExecutor});
    return;
  }
  if (active_.contains(handle)) {
    completion({NativeAnimationOutcome::Rejected, NativeAnimationResultReason::InvalidPlan});
    return;
  }

  auto cancellationToken = std::make_shared<std::atomic_bool>(false);
  active_.emplace(handle, ActiveAnimation{cancellationToken, std::move(completion)});

  runNativeLayoutAnimation_(
      handle, plan, std::move(cancellationToken), [weakThis = weak_from_this(), handle](bool finished) {
        if (const auto strongThis = weakThis.lock()) {
          strongThis->finish(
              handle,
              finished ? NativeAnimationResult{NativeAnimationOutcome::Finished, NativeAnimationResultReason::None}
                       : NativeAnimationResult{
                             NativeAnimationOutcome::Failed, NativeAnimationResultReason::PlatformFailure});
        }
      });
}

void CallbackNativeAnimationExecutor::cancel(
    NativeAnimationHandle handle,
    NativeAnimationCancelDisposition disposition) {
  const auto active = active_.find(handle);
  if (active == active_.end()) {
    return;
  }
  active->second.cancellationToken->store(true, std::memory_order_release);
  if (cancelNativeLayoutAnimation_) {
    cancelNativeLayoutAnimation_(handle, disposition);
  }

  const auto reason = disposition == NativeAnimationCancelDisposition::PreservePresentationForRetarget
      ? NativeAnimationResultReason::Replaced
      : NativeAnimationResultReason::CancelledByOwner;
  const auto outcome = disposition == NativeAnimationCancelDisposition::PreservePresentationForRetarget
      ? NativeAnimationOutcome::Interrupted
      : NativeAnimationOutcome::Cancelled;
  finish(handle, {outcome, reason});
}

void CallbackNativeAnimationExecutor::finish(NativeAnimationHandle handle, NativeAnimationResult result) {
  const auto active = active_.find(handle);
  if (active == active_.end()) {
    return;
  }
  auto completion = std::move(active->second.completion);
  active_.erase(active);
  completion(result);
}

} // namespace reanimated
