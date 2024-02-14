package com.swmansion.reanimated.keyboard;

import androidx.annotation.NonNull;
import androidx.core.view.WindowInsetsAnimationCompat;
import androidx.core.view.WindowInsetsCompat;

import java.util.List;

public class KeyboardAnimationCallback extends WindowInsetsAnimationCompat.Callback {
    private final Keyboard keyboard;
    private final NotifyAboutKeyboardChangeFunction notifyAboutKeyboardChange;

    public KeyboardAnimationCallback(Keyboard keyboard, NotifyAboutKeyboardChangeFunction notifyAboutKeyboardChange) {
        super(WindowInsetsAnimationCompat.Callback.DISPATCH_MODE_CONTINUE_ON_SUBTREE);
        this.notifyAboutKeyboardChange = notifyAboutKeyboardChange;
        this.keyboard = keyboard;
    }

    @NonNull
    @Override
    public WindowInsetsAnimationCompat.BoundsCompat onStart(
            @NonNull WindowInsetsAnimationCompat animation,
            @NonNull WindowInsetsAnimationCompat.BoundsCompat bounds) {
        keyboard.onAnimationStart();
        notifyAboutKeyboardChange.call();
        return super.onStart(animation, bounds);
    }

    @NonNull
    @Override
    public WindowInsetsCompat onProgress(
            @NonNull WindowInsetsCompat insets,
            @NonNull List<WindowInsetsAnimationCompat> runningAnimations) {
        keyboard.updateHeight(insets);
        notifyAboutKeyboardChange.call();
        return insets;
    }

    @Override
    public void onEnd(@NonNull WindowInsetsAnimationCompat animation) {
        keyboard.onAnimationEnd();
        notifyAboutKeyboardChange.call();
    }
}
