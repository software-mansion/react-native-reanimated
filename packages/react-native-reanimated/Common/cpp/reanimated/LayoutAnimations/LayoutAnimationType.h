#pragma once

#include <cstdint>

typedef enum class LayoutAnimationType : std::uint8_t {
  ENTERING = 1,
  EXITING = 2,
  LAYOUT = 3,
  SHARED_ELEMENT_TRANSITION = 4,
  SHARED_ELEMENT_TRANSITION_NATIVE_ID = 5,
  PROGRESS = 6,
} LayoutAnimationType;

#ifndef NDEBUG
/// The roadmap objective that gave the native route to the type, for the development trace.
inline std::uint8_t traceObjectiveOf(const LayoutAnimationType type) {
  return type == LayoutAnimationType::LAYOUT ? 7 : 11;
}
#endif

inline bool needsFinalFrameReconciliation(const LayoutAnimationType type) {
  return type != LayoutAnimationType::SHARED_ELEMENT_TRANSITION && type != LayoutAnimationType::PROGRESS;
}
