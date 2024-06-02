/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.react.modules.deviceinfo;

import android.content.Context;
import androidx.annotation.Nullable;
import com.facebook.fbreact.specs.NativeDeviceInfoSpec;
import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactNoCrashSoftException;
import com.facebook.react.bridge.ReactSoftExceptionLogger;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.module.annotations.ReactModule;
import com.facebook.react.uimanager.DisplayMetricsHolder;
import java.util.HashMap;
import java.util.Map;

/** Module that exposes Android Constants to JS. */
@ReactModule(name = NativeDeviceInfoSpec.NAME)
public class DeviceInfoModule extends NativeDeviceInfoSpec implements LifecycleEventListener {

  private final @Nullable ReactApplicationContext mReactApplicationContext;

  private float mFontScale;
  private @Nullable ReadableMap mPreviousDisplayMetrics;

  public DeviceInfoModule(ReactApplicationContext reactContext) {
    super(reactContext);
    DisplayMetricsHolder.initDisplayMetricsIfNotInitialized(reactContext);
    mFontScale = reactContext.getResources().getConfiguration().fontScale;
    mReactApplicationContext = reactContext;
    mReactApplicationContext.addLifecycleEventListener(this);
  }

  public DeviceInfoModule(Context context) {
    super(null);
    mReactApplicationContext = null;
    DisplayMetricsHolder.initDisplayMetricsIfNotInitialized(context);
    mFontScale = context.getResources().getConfiguration().fontScale;
  }

  @Override
  public @Nullable Map<String, Object> getTypedExportedConstants() {
    WritableMap displayMetrics = DisplayMetricsHolder.getDisplayMetricsWritableMap(mFontScale);

    // Cache the initial dimensions for later comparison in emitUpdateDimensionsEvent
    mPreviousDisplayMetrics = displayMetrics.copy();

    HashMap<String, Object> constants = new HashMap<>();
    constants.put("Dimensions", displayMetrics.toHashMap());
    return constants;
  }

  @Override
  public void onHostResume() {
    if (mReactApplicationContext == null) {
      return;
    }

    float fontScale = mReactApplicationContext.getResources().getConfiguration().fontScale;
    if (mFontScale != fontScale) {
      mFontScale = fontScale;
      emitUpdateDimensionsEvent();
    }
  }

  @Override
  public void onHostPause() {}

  @Override
  public void onHostDestroy() {}

  public void emitUpdateDimensionsEvent() {
    if (mReactApplicationContext == null) {
      return;
    }

    if (mReactApplicationContext.hasActiveReactInstance()) {
      // Don't emit an event to JS if the dimensions haven't changed
      WritableMap displayMetrics = DisplayMetricsHolder.getDisplayMetricsWritableMap(mFontScale);
      if (mPreviousDisplayMetrics == null) {
        mPreviousDisplayMetrics = displayMetrics.copy();
      } else if (!displayMetrics.equals(mPreviousDisplayMetrics)) {
        mPreviousDisplayMetrics = displayMetrics.copy();
        mReactApplicationContext.emitDeviceEvent("didUpdateDimensions", displayMetrics);
      }
    } else {
      ReactSoftExceptionLogger.logSoftException(
          NAME,
          new ReactNoCrashSoftException(
              "No active CatalystInstance, cannot emitUpdateDimensionsEvent"));
    }
  }

  @Override
  public void invalidate() {
    super.invalidate();

    if (mReactApplicationContext != null) {
      mReactApplicationContext.removeLifecycleEventListener(this);
    }
  }
}
