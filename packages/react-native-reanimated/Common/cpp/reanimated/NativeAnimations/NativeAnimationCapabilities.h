#pragma once

#include <reanimated/NativeAnimations/NativeAnimationTypes.h>

namespace reanimated {

enum class NativeAnimationCapabilityReason : uint8_t {
  Supported,
  MissingExecutor,
  InvalidPlan,
  UnsupportedRoute,
  UnsupportedTarget,
  UnsupportedValueType,
  UnsupportedSegment,
};

struct NativeAnimationCapabilityReport {
  NativeAnimationCapabilityReason reason;

  bool supported() const {
    return reason == NativeAnimationCapabilityReason::Supported;
  }
};

} // namespace reanimated
