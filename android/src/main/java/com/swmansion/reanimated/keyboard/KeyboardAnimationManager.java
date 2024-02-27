package com.swmansion.reanimated.keyboard;

import com.facebook.react.bridge.ReactApplicationContext;
import java.lang.ref.WeakReference;
import java.util.HashMap;

@FunctionalInterface
interface NotifyAboutKeyboardChangeFunction {
  void call();
}

public class KeyboardAnimationManager {
  private int nextListenerId = 0;
  private final HashMap<Integer, KeyboardWorkletWrapper> listeners = new HashMap<>();
  private final Keyboard keyboard = new Keyboard();
  private final WindowsInsetsManager windowsInsetsManager;

  public KeyboardAnimationManager(WeakReference<ReactApplicationContext> reactContext) {
    windowsInsetsManager =
        new WindowsInsetsManager(reactContext, keyboard, this::notifyAboutKeyboardChange);
  }

  public int subscribeForKeyboardUpdates(
      KeyboardWorkletWrapper callback, boolean isStatusBarTranslucent) {
    int listenerId = nextListenerId++;
    if (listeners.isEmpty()) {
      KeyboardAnimationCallback keyboardAnimationCallback =
          new KeyboardAnimationCallback(keyboard, this::notifyAboutKeyboardChange);
      windowsInsetsManager.startObservingChanges(keyboardAnimationCallback, isStatusBarTranslucent);
    }
    listeners.put(listenerId, callback);
    return listenerId;
  }

  public void unsubscribeFromKeyboardUpdates(int listenerId) {
    listeners.remove(listenerId);
    if (listeners.isEmpty()) {
      windowsInsetsManager.stopObservingChanges();
    }
  }

  public void notifyAboutKeyboardChange() {
    for (KeyboardWorkletWrapper listener : listeners.values()) {
      listener.invoke(keyboard.getState().asInt(), keyboard.getHeight());
    }
  }
}
