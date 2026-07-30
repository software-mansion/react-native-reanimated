#include <reanimated/NativeAnimations/CallbackNativeAnimationExecutor.h>

#include <utility>
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
  if (plan.descriptor.properties.empty()) {
    return {NativeAnimationCapabilityReason::UnsupportedPlan};
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
  runNativeLayoutAnimation_(
      handle, plan.descriptor, usePresentationLayer, std::move(cancellationToken), [this, handle](bool finished) {
        finish(
            handle,
            finished
                ? NativeAnimationResult{NativeAnimationOutcome::Finished, NativeAnimationResultReason::None}
                : NativeAnimationResult{NativeAnimationOutcome::Failed, NativeAnimationResultReason::PlatformFailure});
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
