package com.swmansion.reanimated

import android.content.ContentResolver
import android.os.SystemClock
import android.provider.Settings
import android.util.Log
import com.facebook.jni.HybridData
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.bridge.JavaOnlyArray
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.common.annotations.FrameworkAPI
import com.facebook.react.fabric.FabricUIManager
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.common.UIManagerType
import com.facebook.soloader.SoLoader
import com.swmansion.common.GestureHandlerStateManager
import com.swmansion.reanimated.keyboard.KeyboardAnimationManager
import com.swmansion.reanimated.keyboard.KeyboardWorkletWrapper
import com.swmansion.reanimated.nativeProxy.AnimationFrameCallback
import com.swmansion.reanimated.nativeProxy.EventHandler
import com.swmansion.reanimated.nativeProxy.SensorSetter
import com.swmansion.reanimated.sensor.ReanimatedSensorContainer
import com.swmansion.reanimated.sensor.ReanimatedSensorType
import java.lang.ref.WeakReference
import java.util.Arrays
import java.util.concurrent.atomic.AtomicBoolean

@Suppress("KotlinJniMissingFunction")
@OptIn(FrameworkAPI::class)
open class NativeProxy {
  companion object {
    init {
      SoLoader.loadLibrary("reanimated")
    }

    // NOTE: Keep in sync with ReanimatedModuleProxy::performOperations
    private const val CMD_START_OF_VIEW = 1
    private const val CMD_START_OF_TRANSFORM = 2
    private const val CMD_END_OF_TRANSFORM = 3
    private const val CMD_END_OF_VIEW = 4

    private const val CMD_OPACITY = 10
    private const val CMD_ELEVATION = 11
    private const val CMD_Z_INDEX = 12
    private const val CMD_SHADOW_OPACITY = 13
    private const val CMD_SHADOW_RADIUS = 14
    private const val CMD_BACKGROUND_COLOR = 15
    private const val CMD_COLOR = 16
    private const val CMD_TINT_COLOR = 17

    private const val CMD_BORDER_RADIUS = 20
    private const val CMD_BORDER_TOP_LEFT_RADIUS = 21
    private const val CMD_BORDER_TOP_RIGHT_RADIUS = 22
    private const val CMD_BORDER_TOP_START_RADIUS = 23
    private const val CMD_BORDER_TOP_END_RADIUS = 24
    private const val CMD_BORDER_BOTTOM_LEFT_RADIUS = 25
    private const val CMD_BORDER_BOTTOM_RIGHT_RADIUS = 26
    private const val CMD_BORDER_BOTTOM_START_RADIUS = 27
    private const val CMD_BORDER_BOTTOM_END_RADIUS = 28
    private const val CMD_BORDER_START_START_RADIUS = 29
    private const val CMD_BORDER_START_END_RADIUS = 30
    private const val CMD_BORDER_END_START_RADIUS = 31
    private const val CMD_BORDER_END_END_RADIUS = 32

    private const val CMD_BORDER_COLOR = 40
    private const val CMD_BORDER_TOP_COLOR = 41
    private const val CMD_BORDER_BOTTOM_COLOR = 42
    private const val CMD_BORDER_LEFT_COLOR = 43
    private const val CMD_BORDER_RIGHT_COLOR = 44
    private const val CMD_BORDER_START_COLOR = 45
    private const val CMD_BORDER_END_COLOR = 46

    private const val CMD_TRANSFORM_TRANSLATE_X = 100
    private const val CMD_TRANSFORM_TRANSLATE_Y = 101
    private const val CMD_TRANSFORM_SCALE = 102
    private const val CMD_TRANSFORM_SCALE_X = 103
    private const val CMD_TRANSFORM_SCALE_Y = 104
    private const val CMD_TRANSFORM_ROTATE = 105
    private const val CMD_TRANSFORM_ROTATE_X = 106
    private const val CMD_TRANSFORM_ROTATE_Y = 107
    private const val CMD_TRANSFORM_ROTATE_Z = 108
    private const val CMD_TRANSFORM_SKEW_X = 109
    private const val CMD_TRANSFORM_SKEW_Y = 110
    private const val CMD_TRANSFORM_MATRIX = 111
    private const val CMD_TRANSFORM_PERSPECTIVE = 112

    private const val CMD_UNIT_DEG = 200
    private const val CMD_UNIT_RAD = 201
    private const val CMD_UNIT_PX = 202
    private const val CMD_UNIT_PERCENT = 203

    private fun commandToString(command: Int): String =
        when (command) {
          CMD_OPACITY -> "opacity"
          CMD_ELEVATION -> "elevation"
          CMD_Z_INDEX -> "zIndex"
          CMD_SHADOW_OPACITY -> "shadowOpacity"
          CMD_SHADOW_RADIUS -> "shadowRadius"
          CMD_BACKGROUND_COLOR -> "backgroundColor"
          CMD_COLOR -> "color"
          CMD_TINT_COLOR -> "tintColor"
          CMD_BORDER_RADIUS -> "borderRadius"
          CMD_BORDER_TOP_LEFT_RADIUS -> "borderTopLeftRadius"
          CMD_BORDER_TOP_RIGHT_RADIUS -> "borderTopRightRadius"
          CMD_BORDER_TOP_START_RADIUS -> "borderTopStartRadius"
          CMD_BORDER_TOP_END_RADIUS -> "borderTopEndRadius"
          CMD_BORDER_BOTTOM_LEFT_RADIUS -> "borderBottomLeftRadius"
          CMD_BORDER_BOTTOM_RIGHT_RADIUS -> "borderBottomRightRadius"
          CMD_BORDER_BOTTOM_START_RADIUS -> "borderBottomStartRadius"
          CMD_BORDER_BOTTOM_END_RADIUS -> "borderBottomEndRadius"
          CMD_BORDER_START_START_RADIUS -> "borderStartStartRadius"
          CMD_BORDER_START_END_RADIUS -> "borderStartEndRadius"
          CMD_BORDER_END_START_RADIUS -> "borderEndStartRadius"
          CMD_BORDER_END_END_RADIUS -> "borderEndEndRadius"
          CMD_BORDER_COLOR -> "borderColor"
          CMD_BORDER_TOP_COLOR -> "borderTopColor"
          CMD_BORDER_BOTTOM_COLOR -> "borderBottomColor"
          CMD_BORDER_LEFT_COLOR -> "borderLeftColor"
          CMD_BORDER_RIGHT_COLOR -> "borderRightColor"
          CMD_BORDER_START_COLOR -> "borderStartColor"
          CMD_BORDER_END_COLOR -> "borderEndColor"
          else -> throw RuntimeException("Unknown command: $command")
        }

    private fun transformCommandToString(transformCommand: Int): String =
        when (transformCommand) {
          CMD_TRANSFORM_TRANSLATE_X -> "translateX"
          CMD_TRANSFORM_TRANSLATE_Y -> "translateY"
          CMD_TRANSFORM_SCALE -> "scale"
          CMD_TRANSFORM_SCALE_X -> "scaleX"
          CMD_TRANSFORM_SCALE_Y -> "scaleY"
          CMD_TRANSFORM_ROTATE -> "rotate"
          CMD_TRANSFORM_ROTATE_X -> "rotateX"
          CMD_TRANSFORM_ROTATE_Y -> "rotateY"
          CMD_TRANSFORM_ROTATE_Z -> "rotateZ"
          CMD_TRANSFORM_SKEW_X -> "skewX"
          CMD_TRANSFORM_SKEW_Y -> "skewY"
          CMD_TRANSFORM_MATRIX -> "matrix"
          CMD_TRANSFORM_PERSPECTIVE -> "perspective"
          else -> throw RuntimeException("Unknown transform command: $transformCommand")
        }
  }

  protected var mNodesManager: NodesManager? = null
  protected val mFabricUIManager: FabricUIManager
  protected val mContext: WeakReference<ReactApplicationContext>
  private val reanimatedSensorContainer: ReanimatedSensorContainer
  private val gestureHandlerStateManager: GestureHandlerStateManager?
  private val keyboardAnimationManager: KeyboardAnimationManager
  private var firstUptime: Long = SystemClock.uptimeMillis()
  private var slowAnimationsEnabled = false
  private val ANIMATIONS_DRAG_FACTOR = 10
  // It turns out it's pretty difficult to set a member of a class
  // instance through JNI so we decided to use a setter instead.
  @set:DoNotStrip
  @Suppress("unused")
  protected var cppVersion: String? = null

  /**
   * Invalidating concurrently could be fatal. It shouldn't happen in a normal flow, but it doesn't
   * cost us much to add synchronization for extra safety.
   */
  private val mInvalidated = AtomicBoolean(false)

  @field:DoNotStrip
  @Suppress("unused")
  private val mHybridData: HybridData

  constructor(context: ReactApplicationContext, nodesManager: NodesManager) {
    context.assertOnJSQueueThread()

    mContext = WeakReference(context)
    reanimatedSensorContainer = ReanimatedSensorContainer(mContext)
    keyboardAnimationManager = KeyboardAnimationManager(mContext)
    addDevMenuOption()

    var tempHandlerStateManager: GestureHandlerStateManager? = null
    try {
      @Suppress("UNCHECKED_CAST")
      val gestureHandlerModuleClass =
          Class.forName("com.swmansion.gesturehandler.react.RNGestureHandlerModule")
              as Class<NativeModule>
      tempHandlerStateManager =
          context.getNativeModule(gestureHandlerModuleClass) as GestureHandlerStateManager?
    } catch (e: ClassCastException) {
      tempHandlerStateManager = null
    } catch (e: ClassNotFoundException) {
      tempHandlerStateManager = null
    }
    gestureHandlerStateManager = tempHandlerStateManager
    mNodesManager = nodesManager

    mFabricUIManager =
        UIManagerHelper.getUIManager(context, UIManagerType.FABRIC) as FabricUIManager

    val callInvokerHolder = context.jsCallInvokerHolder as CallInvokerHolderImpl
    mHybridData =
        initHybrid(
            context.javaScriptContextHolder!!.get(),
            callInvokerHolder,
            mFabricUIManager)
    if (BuildConfig.DEBUG) {
      checkCppVersion() // injectCppVersion should be called during initHybrid above
    }
  }

  private external fun initHybrid(
      jsContext: Long,
      jsCallInvokerHolder: CallInvokerHolderImpl,
      fabricUIManager: FabricUIManager
  ): HybridData

  external fun isAnyHandlerWaitingForEvent(eventName: String, emitterReactTag: Int): Boolean

  external fun performOperations()

  external fun performNonLayoutOperations()

  external fun installJSIBindings()

  private external fun invalidateCpp()

  protected fun getHybridData(): HybridData = mHybridData

  fun invalidate() {
    if (mInvalidated.getAndSet(true)) {
      return
    }
    if (mHybridData.isValid) {
      invalidateCpp()
    }
  }

  private fun toggleSlowAnimations() {
    slowAnimationsEnabled = !slowAnimationsEnabled
    if (slowAnimationsEnabled) {
      firstUptime = SystemClock.uptimeMillis()
    }
    mNodesManager!!.enableSlowAnimations(slowAnimationsEnabled, ANIMATIONS_DRAG_FACTOR)
    try {
      @Suppress("UNCHECKED_CAST")
      val workletsModuleClass =
          Class.forName("com.swmansion.worklets.WorkletsModule") as Class<NativeModule>
      val workletsModule = mContext.get()!!.getNativeModule(workletsModuleClass)
      if (workletsModule != null) {
        try {
          workletsModule.javaClass.getMethod("toggleSlowAnimations").invoke(workletsModule)
        } catch (e: Exception) {
          Log.e("Reanimated", "Failed to toggle slow animations in WorkletsModule", e)
        }
      }
    } catch (e: ClassNotFoundException) {
      Log.e("Reanimated", "WorkletsModule not found when toggling slow animations", e)
    }
  }

  private fun addDevMenuOption() {
    // In Expo, `ApplicationContext` is not an instance of `ReactApplication`
    DevMenuUtils.addDevMenuOption(mContext.get()!!) { toggleSlowAnimations() }
  }

  @DoNotStrip
  fun requestRender(callback: AnimationFrameCallback) {
    UiThreadUtil.assertOnUiThread()
    mNodesManager!!.postOnAnimation(callback)
  }

  @DoNotStrip
  fun getReanimatedJavaVersion(): String = BuildConfig.REANIMATED_VERSION_JAVA

  protected fun checkCppVersion() {
    if (cppVersion == null) {
      throw RuntimeException(
          "[Reanimated] Java side failed to resolve C++ code version. " +
              "See https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#java-side-failed-to-resolve-c-code-version for more information.")
    }
    val javaVersion = getReanimatedJavaVersion()
    if (cppVersion != javaVersion) {
      throw RuntimeException(
          "[Reanimated] Mismatch between Java code version and C++ code version (" +
              javaVersion +
              " vs. " +
              cppVersion +
              " respectively). See " +
              "https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#mismatch-between-java-code-version-and-c-code-version for more information.")
    }
  }

  @DoNotStrip
  fun preserveMountedTags(tags: IntArray): Boolean {
    if (!UiThreadUtil.isOnUiThread()) {
      return false
    }

    for (i in tags.indices) {
      if (mFabricUIManager.resolveView(tags[i]) == null) {
        tags[i] = -1
      }
    }

    return true
  }

  @DoNotStrip
  fun synchronouslyUpdateUIProps(intBuffer: IntArray, doubleBuffer: DoubleArray) {
    val intIterator = Arrays.stream(intBuffer).iterator()
    val doubleIterator = Arrays.stream(doubleBuffer).iterator()
    var viewTag = -1
    var props = JavaOnlyMap()
    while (intIterator.hasNext()) {
      val command = intIterator.nextInt()
      when (command) {
        CMD_START_OF_VIEW -> {
          viewTag = intIterator.nextInt()
          props = JavaOnlyMap()
        }
        CMD_OPACITY,
        CMD_ELEVATION,
        CMD_Z_INDEX,
        CMD_SHADOW_OPACITY,
        CMD_SHADOW_RADIUS -> {
          val name = commandToString(command)
          props.putDouble(name, doubleIterator.nextDouble())
        }
        CMD_BACKGROUND_COLOR,
        CMD_COLOR,
        CMD_TINT_COLOR,
        CMD_BORDER_COLOR,
        CMD_BORDER_TOP_COLOR,
        CMD_BORDER_BOTTOM_COLOR,
        CMD_BORDER_LEFT_COLOR,
        CMD_BORDER_RIGHT_COLOR,
        CMD_BORDER_START_COLOR,
        CMD_BORDER_END_COLOR -> {
          val name = commandToString(command)
          props.putInt(name, intIterator.nextInt())
        }
        CMD_BORDER_RADIUS,
        CMD_BORDER_TOP_LEFT_RADIUS,
        CMD_BORDER_TOP_RIGHT_RADIUS,
        CMD_BORDER_TOP_START_RADIUS,
        CMD_BORDER_TOP_END_RADIUS,
        CMD_BORDER_BOTTOM_LEFT_RADIUS,
        CMD_BORDER_BOTTOM_RIGHT_RADIUS,
        CMD_BORDER_BOTTOM_START_RADIUS,
        CMD_BORDER_BOTTOM_END_RADIUS,
        CMD_BORDER_START_START_RADIUS,
        CMD_BORDER_START_END_RADIUS,
        CMD_BORDER_END_START_RADIUS,
        CMD_BORDER_END_END_RADIUS -> {
          val name = commandToString(command)
          val value = doubleIterator.nextDouble()
          when (intIterator.nextInt()) {
            CMD_UNIT_PX -> props.putDouble(name, value)
            CMD_UNIT_PERCENT -> props.putString(name, "$value%")
            else -> throw RuntimeException("Unknown unit command")
          }
        }
        CMD_START_OF_TRANSFORM -> {
          val transform = JavaOnlyArray()
          while (true) {
            val transformCommand = intIterator.nextInt()
            if (transformCommand == CMD_END_OF_TRANSFORM) {
              props.putArray("transform", transform)
              break
            }
            val name = transformCommandToString(transformCommand)
            when (transformCommand) {
              CMD_TRANSFORM_TRANSLATE_X,
              CMD_TRANSFORM_TRANSLATE_Y -> {
                val value = doubleIterator.nextDouble()
                when (intIterator.nextInt()) {
                  CMD_UNIT_PX -> transform.pushMap(JavaOnlyMap.of(name, value))
                  CMD_UNIT_PERCENT -> transform.pushMap(JavaOnlyMap.of(name, "$value%"))
                  else -> throw RuntimeException("Unknown unit command")
                }
              }
              CMD_TRANSFORM_SCALE,
              CMD_TRANSFORM_SCALE_X,
              CMD_TRANSFORM_SCALE_Y,
              CMD_TRANSFORM_PERSPECTIVE -> {
                val value = doubleIterator.nextDouble()
                transform.pushMap(JavaOnlyMap.of(name, value))
              }
              CMD_TRANSFORM_ROTATE,
              CMD_TRANSFORM_ROTATE_X,
              CMD_TRANSFORM_ROTATE_Y,
              CMD_TRANSFORM_ROTATE_Z,
              CMD_TRANSFORM_SKEW_X,
              CMD_TRANSFORM_SKEW_Y -> {
                val angle = doubleIterator.nextDouble()
                val unit =
                    when (intIterator.nextInt()) {
                      CMD_UNIT_DEG -> "deg"
                      CMD_UNIT_RAD -> "rad"
                      else -> throw RuntimeException("Unknown unit command")
                    }
                transform.pushMap(JavaOnlyMap.of(name, angle.toString() + unit))
              }
              CMD_TRANSFORM_MATRIX -> {
                val length = intIterator.nextInt()
                val matrix = JavaOnlyArray()
                for (i in 0 until length) {
                  matrix.pushDouble(doubleIterator.nextDouble())
                }
                transform.pushMap(JavaOnlyMap.of(name, matrix))
              }
              else -> throw RuntimeException("Unknown transform type: $transformCommand")
            }
          }
        }
        CMD_END_OF_VIEW -> mFabricUIManager.synchronouslyUpdateViewOnUIThread(viewTag, props)
        else -> throw RuntimeException("Unexpected command: $command")
      }
    }
  }

  @DoNotStrip
  fun setGestureState(handlerTag: Int, newState: Int) {
    gestureHandlerStateManager?.setGestureHandlerState(handlerTag, newState)
  }

  @DoNotStrip
  fun getAnimationTimestamp(): Long {
    return if (slowAnimationsEnabled) {
      firstUptime + (SystemClock.uptimeMillis() - firstUptime) / ANIMATIONS_DRAG_FACTOR
    } else {
      SystemClock.uptimeMillis()
    }
  }

  @DoNotStrip
  fun registerEventHandler(handler: EventHandler) {
    handler.mCustomEventNamesResolver = mNodesManager!!.getEventNameResolver()
    mNodesManager!!.registerEventHandler(handler)
  }

  @DoNotStrip
  fun registerSensor(sensorType: Int, interval: Int, setter: SensorSetter): Int {
    return reanimatedSensorContainer.registerSensor(
        ReanimatedSensorType.getInstanceById(sensorType), interval, setter)
  }

  @DoNotStrip
  fun unregisterSensor(sensorId: Int) {
    reanimatedSensorContainer.unregisterSensor(sensorId)
  }

  @DoNotStrip
  fun subscribeForKeyboardEvents(
      keyboardWorkletWrapper: KeyboardWorkletWrapper,
      isStatusBarTranslucent: Boolean,
      isNavigationBarTranslucent: Boolean
  ): Int {
    return keyboardAnimationManager.subscribeForKeyboardUpdates(
        keyboardWorkletWrapper, isStatusBarTranslucent, isNavigationBarTranslucent)
  }

  @DoNotStrip
  fun unsubscribeFromKeyboardEvents(listenerId: Int) {
    keyboardAnimationManager.unsubscribeFromKeyboardUpdates(listenerId)
  }

  @DoNotStrip
  fun getIsReducedMotion(): Boolean {
    val mContentResolver: ContentResolver = mContext.get()!!.contentResolver
    val rawValue =
        Settings.Global.getString(mContentResolver, Settings.Global.TRANSITION_ANIMATION_SCALE)
    val parsedValue = if (rawValue != null) rawValue.toFloat() else 1f
    return parsedValue == 0f
  }

  @DoNotStrip
  fun maybeFlushUIUpdatesQueue() {
    UiThreadUtil.assertOnUiThread()
    if (!mNodesManager!!.isAnimationRunning()) {
      mNodesManager!!.performOperationsRespectingDrawPass()
    }
  }
}
