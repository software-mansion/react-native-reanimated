package com.swmansion.reanimated.sensor

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorManager
import android.hardware.display.DisplayManager
import android.os.Handler
import android.os.Looper
import android.view.Display
import com.facebook.react.bridge.ReactApplicationContext
import com.swmansion.reanimated.nativeProxy.SensorSetter
import java.lang.ref.WeakReference

internal class ReanimatedSensor(
    private val reactContext: WeakReference<ReactApplicationContext>,
    val sensorType: ReanimatedSensorType,
    private val listenerInterval: Int,
    private val setter: SensorSetter,
) {
    var listener: ReanimatedSensorListener? = null
    val sensorManager: SensorManager
    var sensor: Sensor? = null
    private var displayManager: DisplayManager? = null
    private var displayListener: DisplayManager.DisplayListener? = null
    private var samplingPeriodUs = 0
    private var isCancelled = false

    init {
        sensorManager =
            reactContext.get()!!.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    }

    fun initialize(): Boolean {
        val displayManager = reactContext.get()!!.getSystemService(Context.DISPLAY_SERVICE) as DisplayManager
        val display = displayManager.getDisplay(Display.DEFAULT_DISPLAY) ?: return false
        sensor = sensorManager.getDefaultSensor(sensorType.getType()) ?: return false
        listener = ReanimatedSensorListener(setter, listenerInterval.toDouble(), display, sensorType)
        samplingPeriodUs = getSamplingPeriodUs(display)
        sensorManager.registerListener(listener, sensor, samplingPeriodUs)
        if (listenerInterval == -1) {
            this.displayManager = displayManager
            registerDisplayListener(displayManager, display)
        }
        return true
    }

    // The refresh rate can change while the sensor is registered, for example when the system
    // switches between 60 Hz and 120 Hz, so `auto` re-registers with the new period.
    private fun registerDisplayListener(
        displayManager: DisplayManager,
        display: Display,
    ) {
        val displayListener =
            object : DisplayManager.DisplayListener {
                override fun onDisplayChanged(displayId: Int) {
                    if (displayId != Display.DEFAULT_DISPLAY) {
                        return
                    }
                    synchronized(this@ReanimatedSensor) {
                        val newSamplingPeriodUs = getSamplingPeriodUs(display)
                        if (isCancelled || newSamplingPeriodUs == samplingPeriodUs) {
                            return
                        }
                        samplingPeriodUs = newSamplingPeriodUs
                        sensorManager.unregisterListener(listener, sensor)
                        sensorManager.registerListener(listener, sensor, samplingPeriodUs)
                    }
                }

                override fun onDisplayAdded(displayId: Int) {}

                override fun onDisplayRemoved(displayId: Int) {}
            }
        this.displayListener = displayListener
        displayManager.registerDisplayListener(displayListener, Handler(Looper.getMainLooper()))
    }

    // `interval: 'auto'` (-1) matches the refresh rate of the display, as on iOS. Sampling faster
    // only wakes the UI thread for readings that no frame will show.
    private fun getSamplingPeriodUs(display: Display): Int {
        if (listenerInterval != -1) {
            return listenerInterval * 1000
        }
        val refreshRate = display.refreshRate.takeIf { it > 0 } ?: DEFAULT_REFRESH_RATE
        return (1_000_000 / refreshRate).toInt()
    }

    companion object {
        private const val DEFAULT_REFRESH_RATE = 60f
    }

    fun cancel() {
        synchronized(this) {
            isCancelled = true
            displayListener?.let { displayManager?.unregisterDisplayListener(it) }
            sensorManager.unregisterListener(listener, sensor)
        }
    }
}
