package com.swmansion.reanimated;

import androidx.annotation.OptIn;
import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.common.annotations.FrameworkAPI;
import com.facebook.react.fabric.FabricUIManager;
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl;
import com.facebook.react.uimanager.UIManagerHelper;
import com.facebook.react.uimanager.common.UIManagerType;
import com.swmansion.reanimated.layoutReanimation.LayoutAnimations;
import com.swmansion.reanimated.layoutReanimation.NativeMethodsHolder;
import com.swmansion.reanimated.nativeProxy.NativeProxyCommon;
import com.swmansion.worklets.JSCallInvokerResolver;
import com.swmansion.worklets.WorkletsModule;
import java.util.HashMap;
import java.util.Objects;

/**
 * @noinspection JavaJniMissingFunction
 */
public class NativeProxy extends NativeProxyCommon {
  @DoNotStrip
  @SuppressWarnings("unused")
  private final HybridData mHybridData;

  public @OptIn(markerClass = FrameworkAPI.class) NativeProxy(
      ReactApplicationContext context, WorkletsModule workletsModule) {
    super(context);
    ReactFeatureFlagsWrapper.enableMountHooks();

    FabricUIManager fabricUIManager =
        (FabricUIManager) UIManagerHelper.getUIManager(context, UIManagerType.FABRIC);

    LayoutAnimations LayoutAnimations = new LayoutAnimations(context);

    CallInvokerHolderImpl callInvokerHolder = JSCallInvokerResolver.getJSCallInvokerHolder(context);
    mHybridData =
        initHybrid(
            workletsModule,
            Objects.requireNonNull(context.getJavaScriptContextHolder()).get(),
            callInvokerHolder,
            LayoutAnimations,
            context.isBridgeless(),
            fabricUIManager);

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
      boolean isBridgeless,
      FabricUIManager fabricUIManager);

  public native boolean isAnyHandlerWaitingForEvent(String eventName, int emitterReactTag);

  public native void performOperations();

  @Override
  protected HybridData getHybridData() {
    return mHybridData;
  }

  private native void invalidateCpp();

  public void invalidate() {
    invalidateCpp();
  }

  public static NativeMethodsHolder createNativeMethodsHolder(
      LayoutAnimations ignoredLayoutAnimations) {
    return new NativeMethodsHolder() {
      @Override
      public void startAnimation(int tag, int type, HashMap<String, Object> values) {
        // NOT IMPLEMENTED
      }

      @Override
      public boolean isLayoutAnimationEnabled() {
        // NOT IMPLEMENTED
        return false;
      }

      @Override
      public int findPrecedingViewTagForTransition(int tag) {
        // NOT IMPLEMENTED
        return -1;
      }

      @Override
      public boolean shouldAnimateExiting(int tag, boolean shouldAnimate) {
        // NOT IMPLEMENTED
        return false;
      }

      @Override
      public boolean hasAnimation(int tag, int type) {
        // NOT IMPLEMENTED
        return false;
      }

      @Override
      public void clearAnimationConfig(int tag) {
        // NOT IMPLEMENTED
      }

      @Override
      public void cancelAnimation(int tag) {
        // NOT IMPLEMENTED
      }

      @Override
      public void checkDuplicateSharedTag(int viewTag, int screenTag) {
        // NOT IMPLEMENTED
      }

      @Override
      public int[] getSharedGroup(int viewTag) {
        // NOT IMPLEMENTED
        return new int[] {};
      }
    };
  }
}
