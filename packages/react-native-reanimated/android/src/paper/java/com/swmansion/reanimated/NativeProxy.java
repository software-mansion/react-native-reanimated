package com.swmansion.reanimated;

import static com.swmansion.reanimated.Utils.simplifyStringNumbersList;

import androidx.annotation.OptIn;
import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.common.annotations.FrameworkAPI;
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl;
import com.swmansion.reanimated.layoutReanimation.LayoutAnimations;
import com.swmansion.reanimated.layoutReanimation.NativeMethodsHolder;
import com.swmansion.reanimated.nativeProxy.NativeProxyCommon;
import com.swmansion.worklets.JSCallInvokerResolver;
import com.swmansion.worklets.WorkletsModule;
import java.lang.ref.WeakReference;
import java.util.HashMap;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * @noinspection JavaJniMissingFunction
 */
public class NativeProxy extends NativeProxyCommon {
  @DoNotStrip
  @SuppressWarnings("unused")
  private final HybridData mHybridData;

  /**
   * Invalidating concurrently could be fatal. It shouldn't happen in a normal flow, but it doesn't
   * cost us much to add synchronization for extra safety.
   */
  private final AtomicBoolean mInvalidated = new AtomicBoolean(false);

  @OptIn(markerClass = FrameworkAPI.class)
  public NativeProxy(ReactApplicationContext context, WorkletsModule workletsModule) {
    super(context);
    CallInvokerHolderImpl holder = JSCallInvokerResolver.getJSCallInvokerHolder(context);
    LayoutAnimations LayoutAnimations = new LayoutAnimations(context);
    mHybridData =
        initHybrid(
            workletsModule,
            Objects.requireNonNull(context.getJavaScriptContextHolder()).get(),
            holder,
            LayoutAnimations,
            /* isBridgeless */ false);
    prepareLayoutAnimations(LayoutAnimations);
    installJSIBindings();
    if (BuildConfig.DEBUG) {
      checkCppVersion();
    }
  }

  @OptIn(markerClass = FrameworkAPI.class)
  private native HybridData initHybrid(
      WorkletsModule workletsModule,
      long jsContext,
      CallInvokerHolderImpl jsCallInvokerHolder,
      LayoutAnimations LayoutAnimations,
      boolean isBridgeless);

  public native boolean isAnyHandlerWaitingForEvent(String eventName, int emitterReactTag);

  public native void performOperations();

  @Override
  protected HybridData getHybridData() {
    return mHybridData;
  }

  private native void invalidateCpp();

  protected void invalidate() {
    if (mInvalidated.getAndSet(true)) {
      return;
    }
    if (mHybridData != null && mHybridData.isValid()) {
      invalidateCpp();
    }
  }

  public static NativeMethodsHolder createNativeMethodsHolder(LayoutAnimations layoutAnimations) {
    WeakReference<LayoutAnimations> weakLayoutAnimations = new WeakReference<>(layoutAnimations);
    return new NativeMethodsHolder() {
      @Override
      public void startAnimation(int tag, int type, HashMap<String, Object> values) {
        LayoutAnimations layoutAnimations = weakLayoutAnimations.get();
        if (layoutAnimations != null) {
          HashMap<String, String> preparedValues = new HashMap<>();
          for (String key : values.keySet()) {
            String stringValue = values.get(key).toString();
            if (key.endsWith("TransformMatrix")) {
              preparedValues.put(key, simplifyStringNumbersList(stringValue));
            } else {
              preparedValues.put(key, stringValue);
            }
          }
          layoutAnimations.startAnimationForTag(tag, type, preparedValues);
        }
      }

      @Override
      public boolean shouldAnimateExiting(int tag, boolean shouldAnimate) {
        LayoutAnimations layoutAnimations = weakLayoutAnimations.get();
        if (layoutAnimations != null) {
          return layoutAnimations.shouldAnimateExiting(tag, shouldAnimate);
        }
        return false;
      }

      @Override
      public boolean isLayoutAnimationEnabled() {
        LayoutAnimations layoutAnimations = weakLayoutAnimations.get();
        if (layoutAnimations != null) {
          return layoutAnimations.isLayoutAnimationEnabled();
        }
        return false;
      }

      @Override
      public boolean hasAnimation(int tag, int type) {
        LayoutAnimations layoutAnimations = weakLayoutAnimations.get();
        if (layoutAnimations != null) {
          return layoutAnimations.hasAnimationForTag(tag, type);
        }
        return false;
      }

      @Override
      public void clearAnimationConfig(int tag) {
        LayoutAnimations layoutAnimations = weakLayoutAnimations.get();
        if (layoutAnimations != null) {
          layoutAnimations.clearAnimationConfigForTag(tag);
        }
      }

      @Override
      public void cancelAnimation(int tag) {
        LayoutAnimations layoutAnimations = weakLayoutAnimations.get();
        if (layoutAnimations != null) {
          layoutAnimations.cancelAnimationForTag(tag);
        }
      }

      @Override
      public int findPrecedingViewTagForTransition(int tag) {
        LayoutAnimations layoutAnimations = weakLayoutAnimations.get();
        if (layoutAnimations != null) {
          return layoutAnimations.findPrecedingViewTagForTransition(tag);
        }
        return -1;
      }

      public void checkDuplicateSharedTag(int viewTag, int screenTag) {
        LayoutAnimations layoutAnimations = weakLayoutAnimations.get();
        if (layoutAnimations != null) {
          layoutAnimations.checkDuplicateSharedTag(viewTag, screenTag);
        }
      }

      public int[] getSharedGroup(int viewTag) {
        LayoutAnimations layoutAnimations = weakLayoutAnimations.get();
        if (layoutAnimations != null) {
          return layoutAnimations.getSharedGroup(viewTag);
        }
        return new int[] {};
      }
    };
  }
}
