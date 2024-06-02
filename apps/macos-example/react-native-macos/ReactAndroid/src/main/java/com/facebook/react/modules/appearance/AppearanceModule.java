/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.react.modules.appearance;

import android.app.Activity;
import android.content.Context;
import android.content.res.Configuration;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatDelegate;
import com.facebook.fbreact.specs.NativeAppearanceSpec;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.module.annotations.ReactModule;

/** Module that exposes the user's preferred color scheme. */
@ReactModule(name = NativeAppearanceSpec.NAME)
public class AppearanceModule extends NativeAppearanceSpec {

  private static final String APPEARANCE_CHANGED_EVENT_NAME = "appearanceChanged";

  private String mColorScheme = "light";

  private final @Nullable OverrideColorScheme mOverrideColorScheme;

  /** Optional override to the current color scheme */
  public interface OverrideColorScheme {

    /**
     * Color scheme will use the return value instead of the current system configuration. Available
     * scheme: {light, dark}
     */
    public String getScheme();
  }

  public AppearanceModule(ReactApplicationContext reactContext) {
    this(reactContext, null);
  }

  public AppearanceModule(
      ReactApplicationContext reactContext, @Nullable OverrideColorScheme overrideColorScheme) {
    super(reactContext);

    mOverrideColorScheme = overrideColorScheme;
    mColorScheme = colorSchemeForCurrentConfiguration(reactContext);
  }

  private String colorSchemeForCurrentConfiguration(Context context) {
    if (mOverrideColorScheme != null) {
      return mOverrideColorScheme.getScheme();
    }
    int currentNightMode =
        context.getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
    switch (currentNightMode) {
      case Configuration.UI_MODE_NIGHT_NO:
        return "light";
      case Configuration.UI_MODE_NIGHT_YES:
        return "dark";
    }

    return "light";
  }

  @Override
  public void setColorScheme(String style) {
    if (style.equals("dark")) {
      AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_YES);
    } else if (style.equals("light")) {
      AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO);
    } else if (style.equals("unspecified")) {
      AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM);
    }
  }

  @Override
  public String getColorScheme() {
    // Attempt to use the Activity context first in order to get the most up to date
    // scheme. This covers the scenario when AppCompatDelegate.setDefaultNightMode()
    // is called directly (which can occur in Brownfield apps for example).
    Activity activity = getCurrentActivity();

    mColorScheme =
        colorSchemeForCurrentConfiguration(
            activity != null ? activity : getReactApplicationContext());

    return mColorScheme;
  }

  /** Stub */
  @Override
  public void addListener(String eventName) {}

  /** Stub */
  @Override
  public void removeListeners(double count) {}

  /*
   * Call this from your root activity whenever configuration changes. If the
   * color scheme has changed, an event will emitted.
   */
  public void onConfigurationChanged(Context currentContext) {
    String newColorScheme = colorSchemeForCurrentConfiguration(currentContext);
    if (!mColorScheme.equals(newColorScheme)) {
      mColorScheme = newColorScheme;
      emitAppearanceChanged(mColorScheme);
    }
  }

  /** Sends an event to the JS instance that the preferred color scheme has changed. */
  public void emitAppearanceChanged(String colorScheme) {
    WritableMap appearancePreferences = Arguments.createMap();
    appearancePreferences.putString("colorScheme", colorScheme);

    ReactApplicationContext reactApplicationContext = getReactApplicationContextIfActiveOrWarn();

    if (reactApplicationContext != null) {
      reactApplicationContext.emitDeviceEvent(APPEARANCE_CHANGED_EVENT_NAME, appearancePreferences);
    }
  }
}
