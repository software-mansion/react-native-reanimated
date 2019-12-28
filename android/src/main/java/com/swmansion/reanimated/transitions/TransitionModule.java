package com.swmansion.reanimated.transitions;

<<<<<<< HEAD
<<<<<<< HEAD
import androidx.annotation.Nullable;
import androidx.transition.TransitionManager;
=======
>>>>>>> parent of 71b1b0c... Merge pull request #2 from ShaMan123/TransitionStateChange
=======
import androidx.transition.TransitionManager;
>>>>>>> parent of 6e156bb... Merge branch 'android-cwd' into patch-1
import android.view.View;
import android.view.ViewGroup;

import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.uimanager.IllegalViewOperationException;
import com.facebook.react.uimanager.NativeViewHierarchyManager;
import com.facebook.react.uimanager.UIBlock;
import com.facebook.react.uimanager.UIManagerModule;
<<<<<<< HEAD
//fork
=======

>>>>>>> parent of 6e156bb... Merge branch 'android-cwd' into patch-1
public class TransitionModule {

  private final UIManagerModule mUIManager;

  public TransitionModule(UIManagerModule uiManager) {
    mUIManager = uiManager;
  }

<<<<<<< HEAD
  public void animateNextTransition(final ReactContext context, final int rootTag, final ReadableMap config, final @Nullable Callback callback) {
=======
  public void animateNextTransition(final int rootTag, final ReadableMap config) {
>>>>>>> parent of 6e156bb... Merge branch 'android-cwd' into patch-1
    mUIManager.prependUIBlock(new UIBlock() {
      @Override
      public void execute(NativeViewHierarchyManager nativeViewHierarchyManager) {
        try {
<<<<<<< HEAD
          final View rootView = nativeViewHierarchyManager.resolveView(rootTag);
          TransitionHelper transitionHelper = new TransitionHelper(context, rootView, config, callback);
          transitionHelper.beginDelayedTransition();
=======
          View rootView = nativeViewHierarchyManager.resolveView(rootTag);
          if (rootView instanceof ViewGroup) {
            ReadableArray transitions = config.getArray("transitions");
            for (int i = 0, size = transitions.size(); i < size; i++) {
              TransitionManager.beginDelayedTransition(
                      (ViewGroup) rootView,
                      TransitionUtils.inflate(transitions.getMap(i)));
            }
          }
>>>>>>> parent of 6e156bb... Merge branch 'android-cwd' into patch-1
        } catch (IllegalViewOperationException ex) {
          // ignore, view might have not been registered yet
        }

      }
    });

  }

}
