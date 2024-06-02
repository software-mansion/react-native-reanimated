/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.react.devsupport;

import android.app.Activity;
import android.app.Dialog;
import android.view.KeyEvent;
import android.view.Window;
import androidx.annotation.Nullable;
import com.facebook.common.logging.FLog;
import com.facebook.react.R;
import com.facebook.react.common.ReactConstants;
import com.facebook.react.common.SurfaceDelegate;
import com.facebook.react.devsupport.interfaces.DevSupportManager;
import com.facebook.react.devsupport.interfaces.RedBoxHandler;

/**
 * The implementation of SurfaceDelegate with {@link Activity}. This is the default SurfaceDelegate
 * for Mobile.
 */
public class RedBoxDialogSurfaceDelegate implements SurfaceDelegate {

  private final DoubleTapReloadRecognizer mDoubleTapReloadRecognizer;
  private final DevSupportManager mDevSupportManager;

  private @Nullable Dialog mDialog;
  private @Nullable RedBoxContentView mRedBoxContentView;

  public RedBoxDialogSurfaceDelegate(DevSupportManager devSupportManager) {
    mDevSupportManager = devSupportManager;
    mDoubleTapReloadRecognizer = new DoubleTapReloadRecognizer();
  }

  @Override
  public void createContentView(String appKey) {
    // The content view is created in android instead of using react app. Hence the appKey is not
    // used here.
    RedBoxHandler redBoxHandler = mDevSupportManager.getRedBoxHandler();
    Activity context = mDevSupportManager.getCurrentActivity();
    if (context == null || context.isFinishing()) {
      @Nullable String message = mDevSupportManager.getLastErrorTitle();
      FLog.e(
          ReactConstants.TAG,
          "Unable to launch redbox because react activity "
              + "is not available, here is the error that redbox would've displayed: "
              + (message != null ? message : "N/A"));
      return;
    }
    // Create a new RedBox when currentActivity get updated
    mRedBoxContentView = new RedBoxContentView(context);
    mRedBoxContentView
        .setDevSupportManager(mDevSupportManager)
        .setRedBoxHandler(redBoxHandler)
        .init();
  }

  @Override
  public boolean isContentViewReady() {
    return mRedBoxContentView != null;
  }

  @Override
  public void destroyContentView() {
    mRedBoxContentView = null;
  }

  @Override
  public void show() {
    @Nullable String message = mDevSupportManager.getLastErrorTitle();
    Activity context = mDevSupportManager.getCurrentActivity();
    if (context == null || context.isFinishing()) {
      FLog.e(
          ReactConstants.TAG,
          "Unable to launch redbox because react activity "
              + "is not available, here is the error that redbox would've displayed: "
              + (message != null ? message : "N/A"));
      return;
    }

    if (mRedBoxContentView == null || mRedBoxContentView.getContext() != context) {
      // Create a new RedBox when currentActivity get updated
      createContentView("RedBox");
    }

    mRedBoxContentView.refreshContentView();
    if (mDialog == null) {
      mDialog =
          new Dialog(context, R.style.Theme_Catalyst_RedBox) {
            @Override
            public boolean onKeyUp(int keyCode, KeyEvent event) {
              if (keyCode == KeyEvent.KEYCODE_MENU) {
                mDevSupportManager.showDevOptionsDialog();
                return true;
              }
              if (mDoubleTapReloadRecognizer.didDoubleTapR(keyCode, getCurrentFocus())) {
                mDevSupportManager.handleReloadJS();
              }
              return super.onKeyUp(keyCode, event);
            }
          };
      mDialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
      mDialog.setContentView(mRedBoxContentView);
    }
    mDialog.show();
  }

  @Override
  public void hide() {
    // dismiss redbox if exists
    if (mDialog != null) {
      mDialog.dismiss();
      destroyContentView();
      mDialog = null;
    }
  }

  @Override
  public boolean isShowing() {
    return mDialog != null && mDialog.isShowing();
  }
}
