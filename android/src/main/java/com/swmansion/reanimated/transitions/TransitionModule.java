package com.swmansion.reanimated.transitions;

<<<<<<< HEAD
import androidx.annotation.Nullable;
import androidx.transition.TransitionManager;
=======
>>>>>>> parent of 71b1b0c... Merge pull request #2 from ShaMan123/TransitionStateChange
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

  private final UIManagerModule mUIManager;

  public TransitionModule(UIManagerModule uiManager) {
    mUIManager = uiManager;
  }

  public void animateNextTransition(final ReactContext context, final int rootTag, final ReadableMap config, final @Nullable Callback callback) {
    mUIManager.prependUIBlock(new UIBlock() {
      @Override
      public void execute(NativeViewHierarchyManager nativeViewHierarchyManager) {
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
