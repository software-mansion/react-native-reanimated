/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.react.devsupport;

import static android.view.ViewGroup.LayoutParams.MATCH_PARENT;
import static android.view.ViewGroup.LayoutParams.WRAP_CONTENT;

import android.app.Activity;
import android.content.Context;
import android.graphics.Rect;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.WindowManager.BadTokenException;
import android.widget.PopupWindow;
import android.widget.TextView;
import androidx.annotation.Nullable;
import com.facebook.common.logging.FLog;
import com.facebook.react.R;
import com.facebook.react.bridge.UiThreadUtil;
import com.facebook.react.common.ReactConstants;
import com.facebook.react.devsupport.interfaces.DevLoadingViewManager;
import java.util.Locale;

/**
 * Default implementation of Dev Loading View Manager to display loading messages on top of the
 * screen. All methods are thread safe.
 */
public class DefaultDevLoadingViewImplementation implements DevLoadingViewManager {
  private static boolean sEnabled = true;
  private final ReactInstanceDevHelper mReactInstanceDevHelper;
  private @Nullable TextView mDevLoadingView;
  private @Nullable PopupWindow mDevLoadingPopup;

  public static void setDevLoadingEnabled(boolean enabled) {
    sEnabled = enabled;
  }

  public DefaultDevLoadingViewImplementation(ReactInstanceDevHelper reactInstanceManagerHelper) {
    mReactInstanceDevHelper = reactInstanceManagerHelper;
  }

  @Override
  public void showMessage(final String message) {
    if (!sEnabled) {
      return;
    }

    UiThreadUtil.runOnUiThread(
        new Runnable() {
          @Override
          public void run() {
            showInternal(message);
          }
        });
  }

  @Override
  public void updateProgress(
      final @Nullable String status, final @Nullable Integer done, final @Nullable Integer total) {
    if (!sEnabled) {
      return;
    }

    UiThreadUtil.runOnUiThread(
        new Runnable() {
          @Override
          public void run() {
            StringBuilder message = new StringBuilder();
            message.append(status != null ? status : "Loading");
            if (done != null && total != null && total > 0) {
              message.append(
                  String.format(Locale.getDefault(), " %.1f%%", (float) done / total * 100));
            }
            message.append("\u2026"); // `...` character
            if (mDevLoadingView != null) {
              mDevLoadingView.setText(message);
            }
          }
        });
  }

  @Override
  public void hide() {
    if (!sEnabled) {
      return;
    }

    UiThreadUtil.runOnUiThread(
        new Runnable() {
          @Override
          public void run() {
            hideInternal();
          }
        });
  }

  private void showInternal(String message) {
    if (mDevLoadingPopup != null && mDevLoadingPopup.isShowing()) {
      // already showing
      return;
    }

    Activity currentActivity = mReactInstanceDevHelper.getCurrentActivity();
    if (currentActivity == null) {
      FLog.e(
          ReactConstants.TAG,
          "Unable to display loading message because react " + "activity isn't available");
      return;
    }

    // PopupWindow#showAtLocation uses absolute screen position. In order for
    // loading view to be placed below status bar (if the status bar is present) we need to pass
    // an appropriate Y offset.
    try {
      Rect rectangle = new Rect();
      currentActivity.getWindow().getDecorView().getWindowVisibleDisplayFrame(rectangle);
      int topOffset = rectangle.top;

      LayoutInflater inflater =
          (LayoutInflater) currentActivity.getSystemService(Context.LAYOUT_INFLATER_SERVICE);

      mDevLoadingView = (TextView) inflater.inflate(R.layout.dev_loading_view, null);
      mDevLoadingView.setText(message);

      mDevLoadingPopup = new PopupWindow(mDevLoadingView, MATCH_PARENT, WRAP_CONTENT);
      mDevLoadingPopup.setTouchable(false);

      mDevLoadingPopup.showAtLocation(
          currentActivity.getWindow().getDecorView(), Gravity.NO_GRAVITY, 0, topOffset);
      // TODO T164786028: Find out the root cause of the BadTokenException exception here
    } catch (BadTokenException e) {
      FLog.e(
          ReactConstants.TAG,
          "Unable to display loading message because react "
              + "activity isn't active, message: "
              + message);
    }
  }

  private void hideInternal() {
    if (mDevLoadingPopup != null && mDevLoadingPopup.isShowing()) {
      mDevLoadingPopup.dismiss();
      mDevLoadingPopup = null;
      mDevLoadingView = null;
    }
  }

  private @Nullable Context getContext() {
    return mReactInstanceDevHelper.getCurrentActivity();
  }
}
