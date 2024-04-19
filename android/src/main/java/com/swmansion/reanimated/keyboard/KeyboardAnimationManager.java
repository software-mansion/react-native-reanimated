package com.swmansion.reanimated.keyboard;

import android.app.Dialog;
import com.facebook.react.bridge.ReactApplicationContext;
import java.lang.ref.WeakReference;
import java.util.HashMap;

@FunctionalInterface
interface NotifyAboutKeyboardChangeFunction {
  void call();
}

public class KeyboardAnimationManager {
  private int mNextListenerId = 0;
  private final HashMap<Integer, KeyboardWorkletWrapper> mListeners = new HashMap<>();
  private final Keyboard mKeyboard = new Keyboard();
  private final ModalActivityManager mModalActivityManager;

  public KeyboardAnimationManager(WeakReference<ReactApplicationContext> reactContext) {
    mModalActivityManager =
        new ModalActivityManager(reactContext, mKeyboard, this::notifyAboutKeyboardChange);
  }

  public int subscribeForKeyboardUpdates(
      KeyboardWorkletWrapper callback, boolean isStatusBarTranslucent) {
    int listenerId = mNextListenerId++;
    if (mListeners.isEmpty()) {
      mModalActivityManager.startObservingChanges(isStatusBarTranslucent);
    }
    mListeners.put(listenerId, callback);
    return listenerId;
  }

  public void unsubscribeFromKeyboardUpdates(int listenerId) {
    mListeners.remove(listenerId);
    if (mListeners.isEmpty()) {
      mModalActivityManager.stopObservingChanges();
    }
  }

  public void notifyAboutKeyboardChange() {
    for (KeyboardWorkletWrapper listener : mListeners.values()) {
      listener.invoke(mKeyboard.getState().asInt(), mKeyboard.getHeight());
    }
  }

  public void registerNewDialog(Dialog dialog) {
    mModalActivityManager.registerNewDialog(dialog);
  }
}
