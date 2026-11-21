package com.swmansion.reanimated.keyboard

import android.util.DisplayMetrics
import androidx.core.graphics.Insets
import androidx.core.view.WindowInsetsCompat
import com.facebook.react.uimanager.DisplayMetricsHolder
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [30], manifest = Config.NONE)
class KeyboardTest {
    @Before
    fun setDensity() {
        DisplayMetricsHolder.setScreenDisplayMetrics(DisplayMetrics().apply { density = 2f })
    }

    @After
    fun resetDensity() {
        DisplayMetricsHolder.setScreenDisplayMetrics(null)
    }

    @Test
    fun disappearanceWithoutClosingAnimationClearsHeight() {
        val keyboard = Keyboard()
        open(keyboard)

        keyboard.updateHeight(insets(0, visible = false), true)

        assertEquals(0, keyboard.getHeight())
    }

    @Test
    fun visibleZeroCancellationFrameKeepsPreviousHeight() {
        val keyboard = Keyboard()
        open(keyboard)

        keyboard.updateHeight(insets(0), true)
        assertEquals(450, keyboard.getHeight())
        keyboard.updateHeight(insets(800), true)
        assertEquals(400, keyboard.getHeight())
    }

    @Test
    fun animatedOpeningAndClosingSettleAtZero() {
        val keyboard = Keyboard()
        repeat(3) {
            open(keyboard)
            keyboard.onAnimationStart()
            assertEquals(KeyboardState.CLOSING, keyboard.getState())
            keyboard.updateHeight(insets(450), true)
            assertEquals(225, keyboard.getHeight())
            keyboard.updateHeight(insets(0, visible = false), true)
            keyboard.onAnimationEnd()
            assertEquals(0, keyboard.getHeight())
            assertEquals(KeyboardState.CLOSED, keyboard.getState())
        }
    }

    @Test
    fun disappearanceCanBeFollowedByAnotherOpening() {
        val keyboard = Keyboard()
        repeat(3) {
            open(keyboard)
            keyboard.updateHeight(insets(0, visible = false), true)
            assertEquals(0, keyboard.getHeight())
        }
    }

    @Test
    fun opaqueNavigationBarIsSubtractedBeforeDensityConversion() {
        val keyboard = Keyboard()
        keyboard.onAnimationStart()
        keyboard.updateHeight(insets(948, navigation = 48), false)
        keyboard.onAnimationEnd()
        assertEquals(450, keyboard.getHeight())

        keyboard.updateHeight(insets(0, visible = false, navigation = 48), false)
        assertEquals(0, keyboard.getHeight())
    }

    @Test
    fun overlappingTransitionsSettleClosed() {
        val keyboard = Keyboard()
        keyboard.onAnimationStart()
        keyboard.updateHeight(insets(450), true)
        keyboard.onAnimationStart()
        assertEquals(KeyboardState.CLOSING, keyboard.getState())
        keyboard.updateHeight(insets(0, visible = false), true)
        keyboard.onAnimationEnd()
        keyboard.onAnimationEnd()
        assertEquals(0, keyboard.getHeight())
        assertEquals(KeyboardState.CLOSED, keyboard.getState())
    }

    private fun open(keyboard: Keyboard) {
        keyboard.onAnimationStart()
        assertEquals(KeyboardState.OPENING, keyboard.getState())
        keyboard.updateHeight(insets(900), true)
        keyboard.onAnimationEnd()
        assertEquals(KeyboardState.OPEN, keyboard.getState())
        assertEquals(450, keyboard.getHeight())
    }

    private fun insets(
        height: Int,
        visible: Boolean = true,
        navigation: Int = 0,
    ): WindowInsetsCompat =
        WindowInsetsCompat
            .Builder()
            .setInsets(WindowInsetsCompat.Type.ime(), Insets.of(0, 0, 0, height))
            .setVisible(WindowInsetsCompat.Type.ime(), visible)
            .setInsets(WindowInsetsCompat.Type.systemBars(), Insets.of(0, 0, 0, navigation))
            .build()
}
