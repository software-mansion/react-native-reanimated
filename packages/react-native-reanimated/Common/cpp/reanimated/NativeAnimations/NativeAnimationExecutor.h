#pragma once

#include <reanimated/NativeAnimations/NativeAnimationCapabilities.h>
#include <reanimated/NativeAnimations/NativeAnimationPlan.h>

#include <functional>

namespace reanimated {

using NativeAnimationCompletion = std::function<void(NativeAnimationResult)>;

// Callers can use this interface from Reanimated's UI thread. schedule takes
// ownership of the plan and completion. The platform implementation owns both
// until one terminal result is sent. It moves platform work to the main/UI
// thread and sends completion through the owner scheduler before owner state is
// changed. Implementations must not store JSI objects. A scheduled plan is
// immutable.
class NativeAnimationExecutor {
 public:
  virtual ~NativeAnimationExecutor() = default;

  virtual NativeAnimationCapabilityReport queryCapabilities(const NativeAnimationPlan &plan) const = 0;

  virtual void
  schedule(NativeAnimationHandle handle, NativeAnimationPlan plan, NativeAnimationCompletion completion) = 0;

  virtual void cancel(NativeAnimationHandle handle, NativeAnimationCancelDisposition disposition) = 0;
};

} // namespace reanimated
