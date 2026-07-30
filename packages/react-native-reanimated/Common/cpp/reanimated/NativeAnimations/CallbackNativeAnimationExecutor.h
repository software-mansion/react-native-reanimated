#pragma once

#include <reanimated/NativeAnimations/NativeAnimationExecutor.h>
#include <reanimated/NativeAnimations/NativeAnimationPlatformCallbacks.h>

#include <atomic>
#include <functional>
#include <memory>
#include <unordered_map>

namespace reanimated {

// Adapts the stabilized layout PoC callbacks to the shared executor contract.
// Platform callback removal belongs to later platform extraction work.
class CallbackNativeAnimationExecutor final : public NativeAnimationExecutor {
 public:
  CallbackNativeAnimationExecutor(
      RunNativeLayoutAnimation runNativeLayoutAnimation,
      CancelNativeLayoutAnimation cancelNativeLayoutAnimation);
  ~CallbackNativeAnimationExecutor() override;

  NativeAnimationCapabilityReport queryCapabilities(const NativeAnimationPlan &plan) const override;

  void schedule(NativeAnimationHandle handle, NativeAnimationPlan plan, NativeAnimationCompletion completion) override;

  void cancel(NativeAnimationHandle handle, NativeAnimationCancelDisposition disposition) override;

 private:
  struct ActiveAnimation {
    NativeLayoutAnimationCancellationToken cancellationToken;
    NativeAnimationCompletion completion;
  };

  RunNativeLayoutAnimation runNativeLayoutAnimation_;
  CancelNativeLayoutAnimation cancelNativeLayoutAnimation_;
  std::unordered_map<NativeAnimationHandle, ActiveAnimation, NativeAnimationHandleHash> active_;

  void finish(NativeAnimationHandle handle, NativeAnimationResult result);
};

} // namespace reanimated
