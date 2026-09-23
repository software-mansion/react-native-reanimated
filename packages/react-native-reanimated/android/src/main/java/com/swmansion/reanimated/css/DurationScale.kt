package com.swmansion.reanimated.css

import android.animation.ValueAnimator
import android.content.Context
import android.os.Build
import android.provider.Settings

/**
 * `ValueAnimator` scales every duration by a process-global factor, so callers pre-divide by
 * this. Opting one animator out would need `overrideDurationScale`, which is `@hide`.
 */
internal object DurationScale {
    fun effectiveScale(context: Context): Float {
        // Battery saver disables animations without touching Settings.Global.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !ValueAnimator.areAnimatorsEnabled()) {
            return 0f
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return ValueAnimator.getDurationScale()
        }
        return Settings.Global.getFloat(
            context.contentResolver,
            Settings.Global.ANIMATOR_DURATION_SCALE,
            1f,
        )
    }
}
