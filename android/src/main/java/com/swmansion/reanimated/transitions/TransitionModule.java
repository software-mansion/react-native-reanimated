package com.swmansion.reanimated.transitions;

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

import javax.annotation.Nullable;

public class TransitionModule {

  private final UIManagerModule mUIManager;

  public TransitionModule(UIManagerModule uiManager) {
    mUIManager = uiManager;
  }

  public void animateNextTransition(final ReactContext context, final int rootTag, final ReadableMap config, final @Nullable Callback callback) {
    mUIManager.prependUIBlock(new UIBlock() {
      @Override
      public void execute(final NativeViewHierarchyManager nativeViewHierarchyManager) {
        try {
          final View rootView = nativeViewHierarchyManager.resolveView(rootTag);
          TransitionHelper transitionHelper = new TransitionHelper(context, rootView, config, callback);
          transitionHelper.beginDelayedTransition();
        } catch (IllegalViewOperationException ex) {
          // ignore, view might have not been registered yet
        }

      }
    });

  }
}
