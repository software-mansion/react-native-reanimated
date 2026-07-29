package com.swmansion.reanimated.css

import android.animation.ValueAnimator
import android.content.Context
import android.os.Build
import android.provider.Settings

/**
 * `ValueAnimator` multiplies every duration and start delay by a process-global scale,
 * but a CSS transition has to last exactly as long as the author wrote, so callers
 * pre-divide by this. The per-instance opt-out is `max-target-o` and the static setter
 * is process-global, so neither is usable from a library.
 */
internal object DurationScale {
    fun effectiveScale(context: Context): Float {
        // areAnimatorsEnabled() is the only signal that reflects a forced disable,
        // which Settings.Global does not.
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
