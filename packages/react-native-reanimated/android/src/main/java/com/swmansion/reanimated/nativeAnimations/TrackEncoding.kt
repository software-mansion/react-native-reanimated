package com.swmansion.reanimated.nativeAnimations

/**
 * The values of the C++ enums that the platform puts in the track buffers: `AnimationTarget`, `EndpointPolicy`,
 * `AnimationTimingKind`, `TrackStopMode`, `AnimationResultReason`, and `EncodedStart`. The static asserts of
 * AndroidNativeAnimationPlatform.cpp check them.
 */
internal object TrackEncoding {
    const val TARGET_OPACITY = 0
    const val TARGET_BACKGROUND_COLOR = 7
    const val TARGET_BORDER_COLOR = 8
    const val TARGET_BORDER_RADIUS = 9
    const val TARGET_SHADOW_COLOR = 10

    const val ENDPOINT_POLICY_HOLD_WITHOUT_COMMIT = 2

    const val START_VALUE = 0
    const val START_CURRENT_VISUAL_VALUE = 1

    const val TIMING_CUBIC_BEZIER = 1
    const val TIMING_STEPS = 2
    const val TIMING_LINEAR_STOPS = 3

    const val STOP_SETTLE_TO_MODEL = 0

    const val REASON_UNSUPPORTED_REALIZATION = 4
    const val REASON_CURRENT_VALUE_UNAVAILABLE = 5

    /** Surface, tag, owner, generation, target. */
    const val TRACK_KEY_LENGTH = 5
}
