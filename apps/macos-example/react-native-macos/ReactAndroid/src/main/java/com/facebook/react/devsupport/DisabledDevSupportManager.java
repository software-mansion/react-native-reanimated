/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.react.devsupport;

import android.app.Activity;
import android.util.Pair;
import android.view.View;
import androidx.annotation.Nullable;
import com.facebook.react.bridge.DefaultJSExceptionHandler;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.common.SurfaceDelegate;
import com.facebook.react.devsupport.interfaces.BundleLoadCallback;
import com.facebook.react.devsupport.interfaces.DevOptionHandler;
import com.facebook.react.devsupport.interfaces.DevSplitBundleCallback;
import com.facebook.react.devsupport.interfaces.DevSupportManager;
import com.facebook.react.devsupport.interfaces.ErrorCustomizer;
import com.facebook.react.devsupport.interfaces.ErrorType;
import com.facebook.react.devsupport.interfaces.PackagerStatusCallback;
import com.facebook.react.devsupport.interfaces.RedBoxHandler;
import com.facebook.react.devsupport.interfaces.StackFrame;
import com.facebook.react.modules.debug.interfaces.DeveloperSettings;
import java.io.File;

/**
 * A dummy implementation of {@link DevSupportManager} to be used in production mode where
 * development features aren't needed.
 */
public class DisabledDevSupportManager implements DevSupportManager {

  private final DefaultJSExceptionHandler mDefaultJSExceptionHandler;

  public DisabledDevSupportManager() {
    mDefaultJSExceptionHandler = new DefaultJSExceptionHandler();
  }

  @Override
  public void showNewJavaError(String message, Throwable e) {}

  @Override
  public void addCustomDevOption(String optionName, DevOptionHandler optionHandler) {}

  @Override
  public void showNewJSError(String message, ReadableArray details, int errorCookie) {}

  @Override
  public @Nullable View createRootView(String appKey) {
    return null;
  }

  @Override
  public void destroyRootView(View rootView) {}

  @Override
  public void updateJSError(String message, ReadableArray details, int errorCookie) {}

  @Override
  public void hideRedboxDialog() {}

  @Override
  public void showDevOptionsDialog() {}

  @Override
  public void setDevSupportEnabled(boolean isDevSupportEnabled) {}

  @Override
  public void startInspector() {}

  @Override
  public void stopInspector() {}

  @Override
  public void setHotModuleReplacementEnabled(boolean isHotModuleReplacementEnabled) {}

  @Override
  public void setRemoteJSDebugEnabled(boolean isRemoteJSDebugEnabled) {}

  @Override
  public void setFpsDebugEnabled(boolean isFpsDebugEnabled) {}

  @Override
  public void toggleElementInspector() {}

  @Override
  public boolean getDevSupportEnabled() {
    return false;
  }

  @Override
  public DeveloperSettings getDevSettings() {
    return null;
  }

  @Override
  public RedBoxHandler getRedBoxHandler() {
    return null;
  }

  @Override
  public void onNewReactContextCreated(ReactContext reactContext) {}

  @Override
  public void onReactInstanceDestroyed(ReactContext reactContext) {}

  @Override
  public String getSourceMapUrl() {
    return null;
  }

  @Override
  public String getSourceUrl() {
    return null;
  }

  @Override
  public String getJSBundleURLForRemoteDebugging() {
    return null;
  }

  @Override
  public String getDownloadedJSBundleFile() {
    return null;
  }

  @Override
  public boolean hasUpToDateJSBundleInCache() {
    return false;
  }

  @Override
  public void reloadSettings() {}

  @Override
  public void handleReloadJS() {}

  @Override
  public void reloadJSFromServer(String bundleURL) {}

  @Override
  public void reloadJSFromServer(final String bundleURL, final BundleLoadCallback callback) {}

  @Override
  public void loadSplitBundleFromServer(String bundlePath, DevSplitBundleCallback callback) {}

  @Override
  public void isPackagerRunning(final PackagerStatusCallback callback) {
    callback.onPackagerStatusFetched(false);
  }

  @Override
  public @Nullable File downloadBundleResourceFromUrlSync(
      final String resourceURL, final File outputFile) {
    return null;
  }

  @Override
  public @Nullable String getLastErrorTitle() {
    return null;
  }

  @Override
  public @Nullable StackFrame[] getLastErrorStack() {
    return null;
  }

  @Override
  public @Nullable ErrorType getLastErrorType() {
    return null;
  }

  @Override
  public int getLastErrorCookie() {
    return 0;
  }

  @Override
  public void registerErrorCustomizer(ErrorCustomizer errorCustomizer) {}

  @Override
  public Pair<String, StackFrame[]> processErrorCustomizers(Pair<String, StackFrame[]> errorInfo) {
    return errorInfo;
  }

  @Override
  public void setPackagerLocationCustomizer(
      DevSupportManager.PackagerLocationCustomizer packagerLocationCustomizer) {}

  @Override
  public void handleException(Exception e) {
    mDefaultJSExceptionHandler.handleException(e);
  }

  @Override
  public @Nullable Activity getCurrentActivity() {
    return null;
  }

  @Override
  public @Nullable SurfaceDelegate createSurfaceDelegate(String moduleName) {
    return null;
  }
}
