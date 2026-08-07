package com.swmansion.reanimated.css

import android.animation.ValueAnimator
import android.content.Context
import android.os.Build
import android.provider.Settings

/** Animations can be disabled system-wide (duration scale 0, battery saver). */
internal object DurationScale {
    fun animationsEnabled(context: Context): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            return ValueAnimator.areAnimatorsEnabled()
        }
        return Settings.Global.getFloat(
            context.contentResolver,
            Settings.Global.ANIMATOR_DURATION_SCALE,
            1f,
        ) > 0f
    }
}
