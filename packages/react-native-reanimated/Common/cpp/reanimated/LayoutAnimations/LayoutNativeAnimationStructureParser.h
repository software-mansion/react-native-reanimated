#pragma once

#include <jsi/jsi.h>
#include <reanimated/LayoutAnimations/LayoutNativeAnimationAdapter.h>

#include <variant>

namespace reanimated {

using LayoutNativeAnimationParseResult =
    std::variant<LayoutNativeAnimationBuildInput, native_animation::TrackBuildFailure>;

// Converts one build summary from the UI runtime to owned build input in the
// same synchronous call. The `limitExceeded` marker or more properties than
// `maxProperties` returns `ResourceLimit` before the copy; an unexpected
// shape returns `UnsupportedTrackForm`. Runs on the thread that owns `rt`.
LayoutNativeAnimationParseResult
parseLayoutNativeAnimationBuild(facebook::jsi::Runtime &rt, const facebook::jsi::Value &summary, size_t maxProperties);

} // namespace reanimated
