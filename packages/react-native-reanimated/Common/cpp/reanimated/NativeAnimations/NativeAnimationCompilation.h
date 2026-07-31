#pragma once

#include <reanimated/LayoutAnimations/NativeLayoutAnimationDescriptor.h>
#include <reanimated/NativeAnimations/NativeAnimationPlan.h>

#include <optional>
#include <string>

namespace reanimated {

enum class NativeCompilationStatus : uint8_t {
  Native,
  Complete,
  Fallback,
  Invalid,
};

struct NativeCompilationResult {
  NativeCompilationStatus status;
  std::optional<NativeAnimationPlan> plan;
  NativeAnimationRouteReason reason;

  bool native() const {
    return status == NativeCompilationStatus::Native && plan.has_value();
  }

  bool complete() const {
    return status == NativeCompilationStatus::Complete;
  }
};

NativeCompilationResult compileSampledLayoutAnimation(
    const NativeLayoutAnimationDescriptor &descriptor,
    NativeAnimationStartValueSource startValueSource,
    NativeAnimationMountingMode mountingMode,
    NativeAnimationLifecycle lifecycle);

NativeCompilationResult validateNativeAnimationPlan(NativeAnimationPlan plan);

std::string serializeNativeAnimationPlan(const NativeAnimationPlan &plan);

NativeLayoutAnimationDescriptor materializeSampledLayoutDescriptor(
    NativeAnimationHandle handle,
    const NativeAnimationPlan &plan);

} // namespace reanimated
