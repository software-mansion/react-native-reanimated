#pragma once

#include <reanimated/NativeAnimations/NativeAnimationExecutor.h>

#include <optional>
#include <unordered_map>
#include <utility>
#include <vector>

namespace reanimated::testing {

struct FakeScheduledNativeAnimation {
  NativeAnimationHandle handle;
  NativeAnimationPlan plan;
};

struct FakeCancelledNativeAnimation {
  NativeAnimationHandle handle;
  NativeAnimationCancelDisposition disposition;
};

class FakeNativeAnimationExecutor final : public NativeAnimationExecutor {
 public:
  NativeAnimationCapabilityReport capability{NativeAnimationCapabilityReason::Supported};
  mutable std::vector<NativeAnimationPlan> capabilityQueries;
  std::vector<FakeScheduledNativeAnimation> schedules;
  std::vector<FakeCancelledNativeAnimation> cancellations;

  NativeAnimationCapabilityReport queryCapabilities(const NativeAnimationPlan &plan) const override {
    capabilityQueries.push_back(plan);
    return capability;
  }

  void schedule(NativeAnimationHandle handle, NativeAnimationPlan plan, NativeAnimationCompletion completion) override {
    schedules.push_back({handle, std::move(plan)});
    completions_.insert_or_assign(handle, std::move(completion));
  }

  void cancel(NativeAnimationHandle handle, NativeAnimationCancelDisposition disposition) override {
    cancellations.push_back({handle, disposition});
    complete(handle, {NativeAnimationOutcome::Cancelled, NativeAnimationResultReason::CancelledByOwner});
  }

  bool isActive(NativeAnimationHandle handle) const {
    return completions_.contains(handle);
  }

  void complete(NativeAnimationHandle handle, NativeAnimationResult result) {
    const auto completion = completions_.find(handle);
    if (completion == completions_.end()) {
      return;
    }
    auto callback = std::move(completion->second);
    completions_.erase(completion);
    callback(result);
  }

 private:
  std::unordered_map<NativeAnimationHandle, NativeAnimationCompletion, NativeAnimationHandleHash> completions_;
};

} // namespace reanimated::testing
