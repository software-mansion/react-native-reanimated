package com.swmansion.reanimated.css

import android.animation.ValueAnimator
import android.content.Context
import android.os.Build
import android.provider.Settings

/**
 * `ValueAnimator` multiplies every duration and start delay by a process-global scale,
 * but a CSS transition has to last exactly as long as the author wrote, so callers
 * pre-divide by this. `overrideDurationScale` would opt a single animator out, but it
 * is `@hide` with no greylist entry, and the only other setter is process-global.
 */
internal object DurationScale {
    fun effectiveScale(context: Context): Float {
        // Battery saver disables animations without touching Settings.Global, and
        // areAnimatorsEnabled() (literally `scale != 0`) is the only signal for it.
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
