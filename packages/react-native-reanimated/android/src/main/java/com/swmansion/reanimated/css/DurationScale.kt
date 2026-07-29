package com.swmansion.reanimated.css

import android.animation.ValueAnimator
import android.content.Context
import android.os.Build
import android.provider.Settings

/**
 * `ValueAnimator` multiplies every duration and start delay by a process-global
 * scale - Developer options "Animator duration scale", which battery saver forces
 * to 0. A CSS transition has to last exactly as long as the author wrote, so read
 * the scale and pre-divide.
 *
 * The per-instance opt-out (`overrideDurationScale`) is `max-target-o` and the
 * static setter is process-global, so neither is usable from a library.
 */
internal object DurationScale {
    /** 0 means animations are off; the caller should land the end value directly. */
    fun effectiveScale(context: Context): Float {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !ValueAnimator.areAnimatorsEnabled()) {
            // areAnimatorsEnabled() is literally `scale != 0` and is the only signal
            // that reflects a forced disable, which Settings.Global does not.
            return 0f
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return ValueAnimator.getDurationScale()
        }
        // Public since API 16, so every level we support is covered.
        return Settings.Global.getFloat(
            context.contentResolver,
            Settings.Global.ANIMATOR_DURATION_SCALE,
            1f,
        )
    }
}
