package com.swmansion.reanimated.keyboard;

import android.app.Dialog;
import android.content.DialogInterface;
import android.view.Window;
import android.view.WindowManager;
import com.facebook.react.bridge.ReactApplicationContext;
import java.lang.ref.WeakReference;
import java.util.HashSet;

public class ModalManager {
  public static String OPEN_MODAL_EVENT_NAME = "topShow";

  private boolean mIsStatusBarTranslucent = false;


  private final NotifyAboutKeyboardChangeFunction mNotifyAboutKeyboardChange;

  private final Keyboard mKeyboard;
  private final HashSet<DialogInsetsManager> insetsManagersSet = new HashSet<>();

  public ModalManager(
      WeakReference<ReactApplicationContext> reactContext,
      Keyboard keyboard,
      NotifyAboutKeyboardChangeFunction notifyAboutKeyboardChange) {
    mNotifyAboutKeyboardChange = notifyAboutKeyboardChange;
    mKeyboard = keyboard;
  }

  /*
   * Keep registry of all opened modals, and remove the ones that are closing
   * */
  public void registerNewDialog(Dialog dialog, Boolean shouldObserveChanges) {
    Window window = dialog.getWindow();
    window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING);
    DialogInsetsManager insetsManager = new DialogInsetsManager(dialog, mKeyboard, mNotifyAboutKeyboardChange);
    insetsManagersSet.add(insetsManager);

    if (shouldObserveChanges) {
      startObservingChanges(mIsStatusBarTranslucent);
    }

    dialog.setOnDismissListener(
        new DialogInterface.OnDismissListener() {
          @Override
          public void onDismiss(DialogInterface dialog) {
            mKeyboard.onAnimationEnd();
            mNotifyAboutKeyboardChange.call();
            insetsManagersSet.remove(insetsManager);
          }
        });
  }

  public void startObservingChanges(boolean isStatusBarTranslucent) {
    mIsStatusBarTranslucent = isStatusBarTranslucent;

    for (DialogInsetsManager insetsManager: insetsManagersSet) {
      insetsManager.startObservingChanges(mNotifyAboutKeyboardChange, isStatusBarTranslucent);
    }
  }

  public void stopObservingChanges() {
      for (DialogInsetsManager insetsManager: insetsManagersSet) {
      insetsManager.stopObservingChanges();
    }
  }
}
