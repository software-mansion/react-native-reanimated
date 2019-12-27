package com.swmansion.reanimated.transitions;

import androidx.annotation.Nullable;
import androidx.transition.TransitionManager;
import android.view.View;
import android.view.ViewGroup;

import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.uimanager.IllegalViewOperationException;
import com.facebook.react.uimanager.NativeViewHierarchyManager;
import com.facebook.react.uimanager.UIBlock;
import com.facebook.react.uimanager.UIManagerModule;
//fork
public class TransitionModule {

  private final ReactContext mContext;
  private final UIManagerModule mUIManager;

  public TransitionModule(ReactContext context) {
    mContext = context;
    mUIManager = mContext.getNativeModule(UIManagerModule.class);
  }

  public void animateNextTransition(final int rootTag, final ReadableMap config, @Nullable final Callback callback) {
    mUIManager.prependUIBlock(new UIBlock() {
      @Override
      public void execute(NativeViewHierarchyManager nativeViewHierarchyManager) {
        try {
          View rootView = nativeViewHierarchyManager.resolveView(rootTag);
          TransitionHelper transitionHelper = new TransitionHelper(mContext, rootView, config, callback);
          transitionHelper.beginDelayedTransition();
        } catch (IllegalViewOperationException ex) {
          // ignore, view might have not been registered yet
        }
      }
    });

  }

}
