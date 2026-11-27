#pragma once

#include <array>
#include <cstddef>
#include <cstdint>

namespace reanimated {

/// What the native route takes from one layout animation. A larger animation stays frame-driven. The UI
/// runtime does no work for the native route on an animation with too many leaves or operations.
struct NativeLayoutLimits {
  /// One leaf for each native target.
  size_t leaves{6};
  /// For a `transform` leaf. The pixels of a track with more operations are not checked.
  size_t transformOperations{4};
  /// The sum of the segments of the tracks of one animation. A `Transform` track counts the sum of the
  /// segments of its operation timelines.
  size_t segments{64};
};

/// The limit that refuses a layout animation build.
enum class ResourceLimitCause : uint8_t { Leaves, TransformOperations, Segments };

struct NativeLayoutLimit {
  ResourceLimitCause cause;
  /// The key of the limit in the JS form of `NativeLayoutLimits` and in a refusal of the build summary.
  const char *name;
  size_t NativeLayoutLimits::*value;
};

constexpr std::array NATIVE_LAYOUT_LIMITS{
    NativeLayoutLimit{ResourceLimitCause::Leaves, "leaves", &NativeLayoutLimits::leaves},
    NativeLayoutLimit{
        ResourceLimitCause::TransformOperations,
        "transformOperations",
        &NativeLayoutLimits::transformOperations},
    NativeLayoutLimit{ResourceLimitCause::Segments, "segments", &NativeLayoutLimits::segments},
};

} // namespace reanimated
