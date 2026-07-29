package com.swmansion.reanimated.css

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ObjectAnimator
import android.animation.TimeInterpolator
import android.os.Build
import android.view.View
import androidx.annotation.RequiresApi
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.fabric.FabricUIManager
import com.facebook.react.uimanager.IllegalViewOperationException
import java.lang.ref.WeakReference

/**
 * Android counterpart of `REACSSPlatformTransitions`: plays a resolved CSS
 * transition timeline on a native [View] with [ObjectAnimator]. Which [View]
 * channel carries a property is [cssViewChannelFor]'s decision.
 *
 * The whole path requires API 29 (`View.setTransitionAlpha`), gated once where the
 * manager is constructed, so nothing below re-checks the version.
 */
@RequiresApi(Build.VERSION_CODES.Q)
internal class CSSPlatformTransitionsManager(
    private val fabricUIManager: FabricUIManager,
    private val reactContext: WeakReference<ReactApplicationContext>,
) {
    private val animators = HashMap<Key, ObjectAnimator>()
    private val interpolators = HashMap<InterpolatorKey, TimeInterpolator>()

    private data class Key(
        val viewTag: Int,
        val propertyName: String,
    )

    private data class InterpolatorKey(
        val type: Int,
        val pointsX: List<Float>,
        val pointsY: List<Float>,
    )

    fun animateTransition(
        viewTag: Int,
        propertyName: String,
        fromValue: Double,
        toValue: Double,
        durationMs: Double,
        elapsedMs: Double,
        easingType: Int,
        easingPointsX: FloatArray,
        easingPointsY: FloatArray,
    ): Boolean {
        val channel = cssViewChannelFor(propertyName) ?: return false
        if (!channel.canAnimateTo(toValue)) return false
        // Scale 0 is Android's "Remove animations"; ValueAnimator would finish
        // instantly. CSS transitions have no reduced-motion policy, so hand the
        // property back to the loop rather than inventing one here.
        val context = reactContext.get() ?: return false
        val scale = DurationScale.effectiveScale(context)
        if (scale <= 0f) return false

        UiThreadUtil.runOnUiThread {
            val view = viewForTag(viewTag) ?: return@runOnUiThread
            val interpolator = interpolatorFor(easingType, easingPointsX, easingPointsY)
            start(view, Key(viewTag, propertyName), channel, fromValue, toValue, durationMs, elapsedMs, interpolator, scale)
        }
        return true
    }

    fun removeTransition(
        viewTag: Int,
        propertyName: String,
    ) {
        UiThreadUtil.runOnUiThread {
            animators.remove(Key(viewTag, propertyName))?.cancel()
            // Views are pooled and prepareToRecycleView knows nothing about our channel.
            cssViewChannelFor(propertyName)?.let { channel -> viewForTag(viewTag)?.let(channel::reset) }
        }
    }

    private fun start(
        view: View,
        key: Key,
        channel: CSSViewChannel,
        fromValue: Double,
        toValue: Double,
        durationMs: Double,
        elapsedMs: Double,
        interpolator: TimeInterpolator,
        scale: Float,
    ) {
        // On interruption resume from what is on screen: fromValue is the committed
        // style value, so starting there would snap the view back to where the
        // cancelled transition began. Read it before prepare() moves the channel.
        val interrupted = animators.remove(key)
        val startValue = if (interrupted != null) channel.renderedValue(view) else fromValue
        // cancel() leaves the value in place, unlike end(), so an interruption keeps
        // rendering the current frame until the replacement seeks over it.
        interrupted?.cancel()

        channel.prepare(view, toValue)
        val from = channel.channelValue(startValue, toValue)
        val to = channel.channelValue(toValue, toValue)
        channel.property.setValue(view, from)

        val animator = ObjectAnimator.ofFloat(view, channel.property, from, to)
        animator.interpolator = interpolator
        animator.duration = (durationMs / scale).toLong().coerceAtLeast(1L)
        animator.addListener(
            object : AnimatorListenerAdapter() {
                override fun onAnimationEnd(animation: Animator) {
                    // Only drop our own entry: a replacement may already own the key.
                    if (animators[key] === animation) animators.remove(key)
                }
            },
        )
        // A negative elapsed is transition-delay; a positive one is reverse-shortening
        // backdating the start. setCurrentFraction seeks with the scaled duration and
        // applies synchronously, so no frame renders at the un-seeked position.
        if (elapsedMs < 0) animator.startDelay = (-elapsedMs / scale).toLong()
        animator.start()
        animators[key] = animator
        if (elapsedMs > 0 && durationMs > 0) {
            animator.setCurrentFraction((elapsedMs / durationMs).toFloat().coerceIn(0f, 1f))
        }
    }

    /**
     * PathInterpolator flattens its curve natively on construction, so cache the
     * built interpolator. The type is part of the key because different families
     * can share a point list.
     */
    private fun interpolatorFor(
        type: Int,
        pointsX: FloatArray,
        pointsY: FloatArray,
    ): TimeInterpolator {
        val key = InterpolatorKey(type, pointsX.toList(), pointsY.toList())
        return interpolators.getOrPut(key) { CSSEasing.interpolator(type, pointsX, pointsY) }
    }

    private fun viewForTag(viewTag: Int): View? =
        try {
            fabricUIManager.resolveView(viewTag)
        } catch (e: IllegalViewOperationException) {
            // Throws instead of returning null when the tag is registered but the
            // Android view has not been created yet.
            null
        }
}
