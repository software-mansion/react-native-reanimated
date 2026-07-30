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
    for (const auto &segment : track.segments) {
      const bool scalarValues = std::visit(
          [](const auto &typedSegment) {
            using T = std::decay_t<decltype(typedSegment)>;
            if constexpr (std::is_same_v<T, NativeTimingSegment>) {
              return std::holds_alternative<double>(typedSegment.from) &&
                  std::holds_alternative<double>(typedSegment.to) &&
                  typedSegment.easing.kind == NativeTimingFunctionKind::Linear;
            } else if constexpr (std::is_same_v<T, NativeHoldSegment>) {
              return std::holds_alternative<double>(typedSegment.value);
            } else {
              return std::all_of(typedSegment.values.begin(), typedSegment.values.end(), [](const auto &value) {
                return std::holds_alternative<double>(value);
              });
            }
          },
          segment);
      if (!scalarValues) {
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

  const bool usePresentationLayer = plan.startValueSource == NativeAnimationStartValueSource::CurrentVisualValue;
  auto descriptor = materializeSampledLayoutDescriptor(handle, plan);
  if (descriptor.properties.empty()) {
    finish(handle, {NativeAnimationOutcome::Rejected, NativeAnimationResultReason::InvalidPlan});
    return;
  }
  runNativeLayoutAnimation_(
      handle,
      descriptor,
      usePresentationLayer,
      plan.mountingMode,
      std::move(cancellationToken),
      [weakThis = weak_from_this(), handle](bool finished) {
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
    cancelNativeLayoutAnimation_(handle);
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
