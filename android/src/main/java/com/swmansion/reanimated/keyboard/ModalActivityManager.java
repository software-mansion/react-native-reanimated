package com.swmansion.reanimated.keyboard;

import android.app.Dialog;
import android.content.DialogInterface;
import android.view.Window;
import android.view.WindowManager;
import com.facebook.react.bridge.ReactApplicationContext;
import java.lang.ref.WeakReference;
import java.util.HashMap;
import java.util.Map;
import java.util.Stack;

public class ModalActivityManager {
  public static String OPEN_MODAL_EVENT_NAME = "topShow";

  private Integer insetManagersCount = 0;

  private boolean mIsStatusBarTranslucent = false;

  private boolean isObserving = false;

  private final WeakReference<ReactApplicationContext> mReactApplicationContext;

  private final NotifyAboutKeyboardChangeFunction mNotifyAboutKeyboardChange;

  private final Keyboard mKeyboard;

  private final Stack<Window> modalsStack = new Stack<>();

  private final HashMap<Integer, WindowsInsetsManager> insetsManagersMap = new HashMap<>();

  public ModalActivityManager(
      WeakReference<ReactApplicationContext> reactContext,
      Keyboard keyboard,
      NotifyAboutKeyboardChangeFunction notifyAboutKeyboardChange) {
    mNotifyAboutKeyboardChange = notifyAboutKeyboardChange;
    mReactApplicationContext = reactContext;
    mKeyboard = keyboard;

    createInsetManager(); // Create inset manager for main window
  }

  /*
   * Keep registry of all opened modals, and remove the ones that are closing
   * */
  public void registerNewDialog(Dialog dialog) {
    Window window = dialog.getWindow();
    window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING);
    modalsStack.push(window);
    Integer insetManagerId = createInsetManager();

    if (isObserving) {
      startObservingChanges(mIsStatusBarTranslucent);
    }

    dialog.setOnDismissListener(
        new DialogInterface.OnDismissListener() {
          @Override
          public void onDismiss(DialogInterface dialog) {
            mKeyboard.onAnimationEnd();
            mNotifyAboutKeyboardChange.call();
            modalsStack.remove(window);
            insetsManagersMap.remove(insetManagerId);
          }
        });
  }

  public Window getCurrentWindow() {
    if (modalsStack.empty()) {
      return mReactApplicationContext.get().getCurrentActivity().getWindow();
    }

    return modalsStack.peek();
  }

  public Integer createInsetManager() {
    insetManagersCount++;

    WindowsInsetsManager newInsetManager =
        new WindowsInsetsManager(this, mKeyboard, mNotifyAboutKeyboardChange);
    insetsManagersMap.put(insetManagersCount, newInsetManager);

    return insetManagersCount;
  }

  public void startObservingChanges(boolean isStatusBarTranslucent) {
    isObserving = true;
    mIsStatusBarTranslucent = isStatusBarTranslucent;

    for (Map.Entry<Integer, WindowsInsetsManager> entry : insetsManagersMap.entrySet()) {
      WindowsInsetsManager insetsManager = entry.getValue();

      if (!insetsManager.getIsObservingChanges()) {
        insetsManager.startObservingChanges(mNotifyAboutKeyboardChange, isStatusBarTranslucent);
      }
    }
  }

  public void stopObservingChanges() {
    isObserving = false;

    for (Map.Entry<Integer, WindowsInsetsManager> entry : insetsManagersMap.entrySet()) {
      WindowsInsetsManager insetsManager = entry.getValue();

      insetsManager.stopObservingChanges();
    }
  }
}
