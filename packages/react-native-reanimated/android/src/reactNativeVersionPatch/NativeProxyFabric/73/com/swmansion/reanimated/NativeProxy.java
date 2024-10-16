package com.swmansion.reanimated;

import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.queue.MessageQueueThread;
import com.facebook.react.fabric.FabricUIManager;
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl;
import com.facebook.react.uimanager.UIManagerHelper;
import com.facebook.react.uimanager.common.UIManagerType;
import com.swmansion.reanimated.layoutReanimation.LayoutAnimations;
import com.swmansion.reanimated.layoutReanimation.NativeMethodsHolder;
import com.swmansion.reanimated.nativeProxy.NativeProxyCommon;
import java.util.HashMap;

public class NativeProxy extends NativeProxyCommon {
  @DoNotStrip
  @SuppressWarnings("unused")
  private final HybridData mHybridData;

  public NativeProxy(ReactApplicationContext context, String valueUnpackerCode) {
    super(context);
    ReactFeatureFlagsWrapper.enableMountHooks();
    CallInvokerHolderImpl callInvokerHolder =
        (CallInvokerHolderImpl) context.getCatalystInstance().getJSCallInvokerHolder();

    FabricUIManager fabricUIManager =
        (FabricUIManager) UIManagerHelper.getUIManager(context, UIManagerType.FABRIC);

    LayoutAnimations LayoutAnimations = new LayoutAnimations(context);

    ReanimatedMessageQueueThread messageQueueThread = new ReanimatedMessageQueueThread();

    mHybridData =
        initHybrid(
            context.getJavaScriptContextHolder().get(),
            holder,
            mAndroidUIScheduler,
            LayoutAnimations,
            messageQueueThread,
            fabricUIManager,
            valueUnpackerCode);
    prepareLayoutAnimations(LayoutAnimations);
    installJSIBindings();
    if (BuildConfig.DEBUG) {
      checkCppVersion();
    }
  }

  private native HybridData initHybrid(
      long jsContext,
      CallInvokerHolderImpl jsCallInvokerHolder,
      AndroidUIScheduler androidUIScheduler,
      LayoutAnimations LayoutAnimations,
      MessageQueueThread messageQueueThread,
      FabricUIManager fabricUIManager,
      String valueUnpackerCode);

  public native boolean isAnyHandlerWaitingForEvent(String eventName, int emitterReactTag);

  public native void performOperations();

  @Override
  protected HybridData getHybridData() {
    return mHybridData;
  }

  public static NativeMethodsHolder createNativeMethodsHolder(LayoutAnimations layoutAnimations) {
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
