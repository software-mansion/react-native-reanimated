package com.swmansion.reanimated.nativeAnimations

/**
 * The values of the C++ enums that the platform puts in the track buffers: `AnimationTarget`, `EndpointPolicy`,
 * `TransformOperationKind`, `AnimationTimingKind`, `TrackStopMode`, `AnimationResultReason`, `EncodedStart`, and
 * `EncodedBinding`. The static asserts of AndroidNativeAnimationPlatform.cpp check them.
 */
internal object TrackEncoding {
    const val TARGET_OPACITY = 0
    const val TARGET_POSITION = 1
    const val TARGET_POSITION_X = 2
    const val TARGET_POSITION_Y = 3
    const val TARGET_SIZE = 4
    const val TARGET_WIDTH = 5
    const val TARGET_HEIGHT = 6
    const val TARGET_BACKGROUND_COLOR = 7
    const val TARGET_BORDER_COLOR = 8
    const val TARGET_BORDER_RADIUS = 9
    const val TARGET_SHADOW_COLOR = 10
    const val TARGET_TRANSFORM = 14

    const val ENDPOINT_POLICY_MOUNTED_MODEL_MUST_MATCH_ENDPOINT = 0
    const val ENDPOINT_POLICY_EXECUTOR_COMMITS_ENDPOINT = 1
    const val ENDPOINT_POLICY_HOLD_WITHOUT_COMMIT = 2

    /** The timeline of a value body has no operation. */
    const val NO_OPERATION = -1
    const val OPERATION_TRANSLATE_X = 0
    const val OPERATION_TRANSLATE_Y = 1
    const val OPERATION_SCALE = 2
    const val OPERATION_SCALE_X = 3
    const val OPERATION_SCALE_Y = 4
    const val OPERATION_ROTATE_Z = 7

    const val START_VALUE = 0
    const val START_CURRENT_VISUAL_VALUE = 1

    const val BINDING_WRITER = 0
    const val BINDING_HOLD = 1

    const val TIMING_CUBIC_BEZIER = 1
    const val TIMING_STEPS = 2
    const val TIMING_LINEAR_STOPS = 3
    const val TIMING_SPRING = 4

    const val STOP_SETTLE_TO_MODEL = 0

    const val REASON_UNSUPPORTED_REALIZATION = 4
    const val REASON_CURRENT_VALUE_UNAVAILABLE = 5

    /** Surface, tag, owner, generation, target. */
    const val TRACK_KEY_LENGTH = 5
}
