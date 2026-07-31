package com.swmansion.reanimated.css

import android.animation.ValueAnimator
import android.content.Context
import android.os.Build
import android.provider.Settings

/**
 * The process-global animator duration scale. A CSS transition follows its authored
 * timeline, so callers only consult this for the zero case, where animations are
 * disabled entirely and the property has to settle without animating.
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
