package com.swmansion.reanimated;

import android.util.Log;

import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.queue.MessageQueueThread;
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl;
import com.swmansion.reanimated.layoutReanimation.AnimationsManager;
import com.swmansion.reanimated.layoutReanimation.LayoutAnimations;
import com.swmansion.reanimated.layoutReanimation.NativeMethodsHolder;
import com.swmansion.reanimated.nativeProxy.NativeProxyCommon;

import java.lang.ref.WeakReference;
import java.util.HashMap;

public class NativeProxy extends NativeProxyCommon {
    @DoNotStrip
    @SuppressWarnings("unused")
    private final HybridData mHybridData;

    public NativeProxy(ReactApplicationContext context) {
        super(context);
        CallInvokerHolderImpl holder =
                (CallInvokerHolderImpl) context.getCatalystInstance().getJSCallInvokerHolder();
        LayoutAnimations LayoutAnimations = new LayoutAnimations(context);
        mHybridData =
                initHybrid(
                        context.getJavaScriptContextHolder().get(),
                        holder,
                        mScheduler,
                        LayoutAnimations);
        prepareLayoutAnimations(LayoutAnimations);
        ReanimatedMessageQueueThread messageQueueThread = new ReanimatedMessageQueueThread();
        installJSIBindings(messageQueueThread);
    }

    private native HybridData initHybrid(
            long jsContext,
            CallInvokerHolderImpl jsCallInvokerHolder,
            Scheduler scheduler,
            LayoutAnimations LayoutAnimations);

    private native void installJSIBindings(MessageQueueThread messageQueueThread);

    public native boolean isAnyHandlerWaitingForEvent(String eventName);

    public native void performOperations();

    public void onCatalystInstanceDestroy() {
        mScheduler.deactivate();
        mHybridData.resetNative();
    }

    // TODO: move to NativeProxyCommon.java when layout animations are fixed on Fabric 
    public void prepareLayoutAnimations(LayoutAnimations LayoutAnimations) {
        if (Utils.isChromeDebugger) {
            Log.w("[REANIMATED]", "You can not use LayoutAnimation with enabled Chrome Debugger");
            return;
        }
        mNodesManager = mContext.get().getNativeModule(ReanimatedModule.class).getNodesManager();

        AnimationsManager animationsManager =
                mContext
                        .get()
                        .getNativeModule(ReanimatedModule.class)
                        .getNodesManager()
                        .getAnimationsManager();

        WeakReference<LayoutAnimations> weakLayoutAnimations = new WeakReference<>(LayoutAnimations);
        animationsManager.setNativeMethods(
                new NativeMethodsHolder() {
                    @Override
                    public void startAnimation(int tag, String type, HashMap<String, Float> values) {
                        LayoutAnimations LayoutAnimations = weakLayoutAnimations.get();
                        if (LayoutAnimations != null) {
                            HashMap<String, String> preparedValues = new HashMap<>();
                            for (String key : values.keySet()) {
                                preparedValues.put(key, values.get(key).toString());
                            }
                            LayoutAnimations.startAnimationForTag(tag, type, preparedValues);
                        }
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
                    public boolean hasAnimation(int tag, String type) {
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
                    public int findPrecedingViewTagForTransition(int tag) {
                        LayoutAnimations layoutAnimations = weakLayoutAnimations.get();
                        if (layoutAnimations != null) {
                            return layoutAnimations.findPrecedingViewTagForTransition(tag);
                        }
                        return -1;
                    }
                });
    }
}
