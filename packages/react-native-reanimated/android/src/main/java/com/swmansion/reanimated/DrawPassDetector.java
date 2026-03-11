package com.swmansion.reanimated;

import android.app.Activity;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.ViewTreeObserver;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.UiThreadUtil;
import javax.annotation.Nullable;

/** Tracks whether the current UI thread turn is inside a draw pass. */
class DrawPassDetector {
  private final ReactApplicationContext mContext;
  private final Handler mHandler = new Handler(Looper.getMainLooper());
  private final Runnable mClearRunnable = () -> mIsInDrawPass = false;
  private boolean mIsInDrawPass = false;
  @Nullable private View mDecorView = null;

  private final ViewTreeObserver.OnDrawListener mOnDrawListener =
      () -> {
        mIsInDrawPass = true;
        mHandler.postAtFrontOfQueue(mClearRunnable);
      };

  DrawPassDetector(ReactApplicationContext context) {
    mContext = context;
  }

  void initialize() {
    Activity activity = mContext.getCurrentActivity();
    if (activity == null) {
      return;
    }

    View decorView = activity.getWindow().getDecorView();
    if (decorView == mDecorView) {
      return;
    }

    // Decor view has changed (e.g. Activity recreated) — detach from the old one first.
    if (mDecorView != null) {
      ViewTreeObserver oldObserver = mDecorView.getViewTreeObserver();
      if (oldObserver.isAlive()) {
        oldObserver.removeOnDrawListener(mOnDrawListener);
      }
      mDecorView = null;
    }

    ViewTreeObserver observer = decorView.getViewTreeObserver();
    if (!observer.isAlive()) {
      return;
    }

    mDecorView = decorView;
    observer.addOnDrawListener(mOnDrawListener);
  }

  boolean isInDrawPass() {
    return mIsInDrawPass;
  }

  void invalidate() {
    if (UiThreadUtil.isOnUiThread()) {
      invalidateOnUiThread();
    } else {
      mHandler.post(this::invalidateOnUiThread);
    }
  }

  private void invalidateOnUiThread() {
    if (mDecorView != null) {
      ViewTreeObserver observer = mDecorView.getViewTreeObserver();
      if (observer.isAlive()) {
        observer.removeOnDrawListener(mOnDrawListener);
      }
      mDecorView = null;
    }
    mHandler.removeCallbacks(mClearRunnable);
    mIsInDrawPass = false;
  }
}
