package com.swmansion.reanimated.keyboard;

import android.app.Dialog;
import android.view.Window;

import javax.annotation.Nullable;

public class DialogInsetsManager extends InsetsManager {
    private final Dialog mDialog;

    public DialogInsetsManager(
            Dialog dialog,
            Keyboard keyboard,
            NotifyAboutKeyboardChangeFunction notifyAboutKeyboardChange) {
        super(keyboard, notifyAboutKeyboardChange);
        mDialog = dialog;
    }

    @Nullable
    Window getWindow() {
        return mDialog.getWindow();
    }
}
