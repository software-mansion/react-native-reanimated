#pragma once

#include <cstddef>

namespace reanimated {

/// What the native route takes from one layout animation. A larger animation stays frame-driven. The UI
/// runtime does no work for the native route on an animation with too many leaves or operations.
struct NativeLayoutLimits {
  /// One leaf for each native target.
  size_t leaves{6};
  /// For a `transform` leaf. A cap with no cost data.
  size_t transformOperations{4};
  /// The sum of the segments of the tracks of one animation. A `Transform` track counts the sum of the
  /// segments of its operation timelines.
  size_t segments{64};
};

} // namespace reanimated
