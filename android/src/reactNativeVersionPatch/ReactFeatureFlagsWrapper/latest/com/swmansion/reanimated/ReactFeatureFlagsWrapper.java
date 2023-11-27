package com.swmansion.reanimated;

import com.facebook.react.config.ReactFeatureFlags;

public class ReactFeatureFlagsWrapper {

  public static void setFlags(boolean enableMountHooks) {
    ReactFeatureFlags.enableMountHooks = true;
  }

}
