package com.swmansion.reanimated.keyboard;

import android.app.Dialog;
import com.facebook.react.bridge.ReactApplicationContext;
import java.lang.ref.WeakReference;
import java.util.concurrent.ConcurrentHashMap;

@FunctionalInterface
interface NotifyAboutKeyboardChangeFunction {
  void call();
}

public class KeyboardAnimationManager {
  private int mNextListenerId = 0;
  private final ConcurrentHashMap<Integer, KeyboardWorkletWrapper> mListeners =
      new ConcurrentHashMap<>();
  private final Keyboard mKeyboard = new Keyboard();
  private final ModalManager mModalManager;

  private final WindowInsetsManager mWindowInsetsManager;

  public KeyboardAnimationManager(WeakReference<ReactApplicationContext> reactContext) {
    mWindowInsetsManager =
        new WindowInsetsManager(reactContext, mKeyboard, this::notifyAboutKeyboardChange);
    mModalManager = new ModalManager(reactContext, mKeyboard, this::notifyAboutKeyboardChange);
  }

  public int subscribeForKeyboardUpdates(
      KeyboardWorkletWrapper callback, boolean isStatusBarTranslucent) {
    int listenerId = mNextListenerId++;
    if (mListeners.isEmpty()) {
      mWindowInsetsManager.startObservingChanges(
          this::notifyAboutKeyboardChange, isStatusBarTranslucent);
      mModalManager.startObservingChanges(isStatusBarTranslucent);
    }
    mListeners.put(listenerId, callback);
    return listenerId;
  }

  public void unsubscribeFromKeyboardUpdates(int listenerId) {
    mListeners.remove(listenerId);
    if (mListeners.isEmpty()) {
      mWindowInsetsManager.stopObservingChanges();
      mModalManager.stopObservingChanges();
    }
  }

  public void notifyAboutKeyboardChange() {
    for (KeyboardWorkletWrapper listener : mListeners.values()) {
      listener.invoke(mKeyboard.getState().asInt(), mKeyboard.getHeight());
    }
  }

  public void registerNewDialog(Dialog dialog) {
    mModalManager.registerNewDialog(dialog, !mListeners.isEmpty());
  }
}
