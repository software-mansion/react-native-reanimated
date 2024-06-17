package com.swmansion.reanimated.keyboard;

import android.app.Activity;
import android.view.Window;

import com.facebook.react.bridge.ReactApplicationContext;

import java.lang.ref.WeakReference;

import javax.annotation.Nullable;

public class WindowInsetsManager extends InsetsManager {
    private final WeakReference<ReactApplicationContext> mReactContext;

    public WindowInsetsManager(
            WeakReference<ReactApplicationContext> reactContext,
            Keyboard keyboard,
            NotifyAboutKeyboardChangeFunction notifyAboutKeyboardChange) {
        super(keyboard, notifyAboutKeyboardChange);
        mReactContext = reactContext;
    }

    @Nullable
    Window getWindow() {
        Activity currentActivity = mReactContext.get().getCurrentActivity();
        if (currentActivity == null) {
            return null;
        }

        return currentActivity.getWindow();
    }
}
