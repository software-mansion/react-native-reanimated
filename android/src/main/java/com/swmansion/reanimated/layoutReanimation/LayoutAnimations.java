package com.swmansion.reanimated.layoutReanimation;

import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl;
import com.swmansion.reanimated.ReanimatedModule;
import com.swmansion.reanimated.Scheduler;

import java.lang.ref.WeakReference;
import java.util.HashMap;
import java.util.Map;

public class LayoutAnimations {
    static {
        System.loadLibrary("reanimated");
    }

    @DoNotStrip
    @SuppressWarnings("unused")
    private final HybridData mHybridData;
    private WeakReference<ReactApplicationContext> mContext;

    public LayoutAnimations(ReactApplicationContext context) {
        mContext = new WeakReference<>(context);
        mHybridData = initHybrid();
    }

    private native HybridData initHybrid();

    // LayoutReanimation
    public native void startAnimationForTag(int tag, String type, Map<String, String> values);
    public native void removeConfigForTag(int tag);

    private void notifyAboutEnd(int tag, int cancelledInt) {
        ReactApplicationContext context = mContext.get();
        if (context != null) {
            context.getNativeModule(ReanimatedModule.class)
                    .getNodesManager()
                    .getReactBatchObserver()
                    .getAnimationsManager()
                    .notifyAboutEnd(tag, (cancelledInt == 0)? false : true);
        }
    }

    private void notifyAboutProgress(Map<String, Object> newStyle, int tag) {
        ReactApplicationContext context = mContext.get();
        if (context != null) {
            context.getNativeModule(ReanimatedModule.class)
                    .getNodesManager()
                    .getReactBatchObserver()
                    .getAnimationsManager()
                    .notifyAboutProgress(newStyle, tag);
        }
    }
}
