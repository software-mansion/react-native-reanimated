/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.react;

import android.annotation.TargetApi;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.res.Configuration;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import androidx.annotation.Nullable;
import com.facebook.infer.annotation.Assertions;
import com.facebook.react.bridge.Callback;
import com.facebook.react.config.ReactFeatureFlags;
import com.facebook.react.modules.core.PermissionListener;

/**
 * Delegate class for {@link ReactActivity}. You can subclass this to provide custom implementations
 * for e.g. {@link #getReactNativeHost()}, if your Application class doesn't implement {@link
 * ReactApplication}.
 */
public class ReactActivityDelegate {

  private final @Nullable Activity mActivity;
  private final @Nullable String mMainComponentName;

  private @Nullable PermissionListener mPermissionListener;
  private @Nullable Callback mPermissionsCallback;
  private ReactDelegate mReactDelegate;

  @Deprecated
  public ReactActivityDelegate(Activity activity, @Nullable String mainComponentName) {
    mActivity = activity;
    mMainComponentName = mainComponentName;
  }

  public ReactActivityDelegate(ReactActivity activity, @Nullable String mainComponentName) {
    mActivity = activity;
    mMainComponentName = mainComponentName;
  }

  /**
   * Public API to populate the launch options that will be passed to React. Here you can customize
   * the values that will be passed as `initialProperties` to the Renderer.
   *
   * @return Either null or a key-value map as a Bundle
   */
  protected @Nullable Bundle getLaunchOptions() {
    return null;
  }

  protected @Nullable Bundle composeLaunchOptions() {
    Bundle composedLaunchOptions = getLaunchOptions();
    if (isFabricEnabled()) {
      if (composedLaunchOptions == null) {
        composedLaunchOptions = new Bundle();
      }
      composedLaunchOptions.putBoolean("concurrentRoot", true);
    }
    return composedLaunchOptions;
  }

  protected ReactRootView createRootView() {
    return new ReactRootView(getContext());
  }

  protected ReactRootView createRootView(Bundle initialProps) {
    return new ReactRootView(getContext());
  }

  /**
   * Get the {@link ReactNativeHost} used by this app. By default, assumes {@link
   * Activity#getApplication()} is an instance of {@link ReactApplication} and calls {@link
   * ReactApplication#getReactNativeHost()}. Override this method if your application class does not
   * implement {@code ReactApplication} or you simply have a different mechanism for storing a
   * {@code ReactNativeHost}, e.g. as a static field somewhere.
   */
  protected ReactNativeHost getReactNativeHost() {
    return ((ReactApplication) getPlainActivity().getApplication()).getReactNativeHost();
  }

  public ReactHost getReactHost() {
    return ((ReactApplication) getPlainActivity().getApplication()).getReactHost();
  }

  public ReactInstanceManager getReactInstanceManager() {
    return mReactDelegate.getReactInstanceManager();
  }

  public String getMainComponentName() {
    return mMainComponentName;
  }

  protected void onCreate(Bundle savedInstanceState) {
    String mainComponentName = getMainComponentName();
    final Bundle launchOptions = composeLaunchOptions();
    if (ReactFeatureFlags.enableBridgelessArchitecture) {
      mReactDelegate =
          new ReactDelegate(getPlainActivity(), getReactHost(), mainComponentName, launchOptions);
    } else {
      mReactDelegate =
          new ReactDelegate(
              getPlainActivity(), getReactNativeHost(), mainComponentName, launchOptions) {
            @Override
            protected ReactRootView createRootView() {
              return ReactActivityDelegate.this.createRootView(launchOptions);
            }
          };
    }
    if (mainComponentName != null) {
      loadApp(mainComponentName);
    }
  }

  protected void loadApp(String appKey) {
    mReactDelegate.loadApp(appKey);
    getPlainActivity().setContentView(mReactDelegate.getReactRootView());
  }

  protected void onPause() {
    mReactDelegate.onHostPause();
  }

  protected void onResume() {
    mReactDelegate.onHostResume();

    if (mPermissionsCallback != null) {
      mPermissionsCallback.invoke();
      mPermissionsCallback = null;
    }
  }

  protected void onDestroy() {
    mReactDelegate.onHostDestroy();
  }

  public void onActivityResult(int requestCode, int resultCode, Intent data) {
    mReactDelegate.onActivityResult(requestCode, resultCode, data, true);
  }

  public boolean onKeyDown(int keyCode, KeyEvent event) {
    if (!ReactFeatureFlags.enableBridgelessArchitecture) {
      if (getReactNativeHost().hasInstance()
          && getReactNativeHost().getUseDeveloperSupport()
          && keyCode == KeyEvent.KEYCODE_MEDIA_FAST_FORWARD) {
        event.startTracking();
        return true;
      }
    }
    return false;
  }

  public boolean onKeyUp(int keyCode, KeyEvent event) {
    return mReactDelegate.shouldShowDevMenuOrReload(keyCode, event);
  }

  public boolean onKeyLongPress(int keyCode, KeyEvent event) {
    if (!ReactFeatureFlags.enableBridgelessArchitecture) {
      if (getReactNativeHost().hasInstance()
          && getReactNativeHost().getUseDeveloperSupport()
          && keyCode == KeyEvent.KEYCODE_MEDIA_FAST_FORWARD) {
        getReactNativeHost().getReactInstanceManager().showDevOptionsDialog();
        return true;
      }
    }
    return false;
  }

  public boolean onBackPressed() {
    return mReactDelegate.onBackPressed();
  }

  public boolean onNewIntent(Intent intent) {
    if (!ReactFeatureFlags.enableBridgelessArchitecture) {
      if (getReactNativeHost().hasInstance()) {
        getReactNativeHost().getReactInstanceManager().onNewIntent(intent);
        return true;
      }
    }
    return false;
  }

  public void onWindowFocusChanged(boolean hasFocus) {
    if (!ReactFeatureFlags.enableBridgelessArchitecture) {
      if (getReactNativeHost().hasInstance()) {
        getReactNativeHost().getReactInstanceManager().onWindowFocusChange(hasFocus);
      }
    }
  }

  public void onConfigurationChanged(Configuration newConfig) {
    if (!ReactFeatureFlags.enableBridgelessArchitecture) {
      if (getReactNativeHost().hasInstance()) {
        getReactInstanceManager().onConfigurationChanged(getContext(), newConfig);
      }
    }
  }

  @TargetApi(Build.VERSION_CODES.M)
  public void requestPermissions(
      String[] permissions, int requestCode, PermissionListener listener) {
    mPermissionListener = listener;
    getPlainActivity().requestPermissions(permissions, requestCode);
  }

  public void onRequestPermissionsResult(
      final int requestCode, final String[] permissions, final int[] grantResults) {
    mPermissionsCallback =
        new Callback() {
          @Override
          public void invoke(Object... args) {
            if (mPermissionListener != null
                && mPermissionListener.onRequestPermissionsResult(
                    requestCode, permissions, grantResults)) {
              mPermissionListener = null;
            }
          }
        };
  }

  protected Context getContext() {
    return Assertions.assertNotNull(mActivity);
  }

  protected Activity getPlainActivity() {
    return ((Activity) getContext());
  }

  /**
   * Override this method if you wish to selectively toggle Fabric for a specific surface. This will
   * also control if Concurrent Root (React 18) should be enabled or not.
   *
   * @return true if Fabric is enabled for this Activity, false otherwise.
   */
  protected boolean isFabricEnabled() {
    return false;
  }
}
