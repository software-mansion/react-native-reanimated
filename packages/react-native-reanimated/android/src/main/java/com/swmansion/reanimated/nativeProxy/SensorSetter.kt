package com.swmansion.reanimated.nativeProxy

import com.facebook.jni.HybridData
import com.facebook.proguard.annotations.DoNotStrip

@DoNotStrip
class SensorSetter {

  @field:DoNotStrip private val mHybridData: HybridData

  @DoNotStrip
  private constructor(hybridData: HybridData) {
    mHybridData = hybridData
  }

  external fun sensorSetter(value: FloatArray, orientationDegrees: Int)
}
