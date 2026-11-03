#pragma once

#include <cstddef>

namespace reanimated {

/// What the native route takes from one layout animation. A larger animation stays frame-driven, and the UI
/// runtime does no work for the native route on it.
struct NativeLayoutLimits {
  /// One leaf for each native target.
  size_t leaves{6};
  /// For a `transform` leaf. A cap with no cost data.
  size_t transformOperations{4};
};

} // namespace reanimated
