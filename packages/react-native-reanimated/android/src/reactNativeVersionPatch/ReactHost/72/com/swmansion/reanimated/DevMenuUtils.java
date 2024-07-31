package com.swmansion.reanimated;

import com.facebook.react.ReactApplication;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.devsupport.interfaces.DevOptionHandler;
import com.facebook.react.devsupport.interfaces.DevSupportManager;

public class DevMenuUtils {

  public static void addDevMenuOption(ReactApplicationContext context, DevOptionHandler handler) {
    // In Expo, `ApplicationContext` is not an instance of `ReactApplication`
    if (context.getApplicationContext() instanceof ReactApplication) {
      final DevSupportManager devSupportManager =
          ((ReactApplication) context.getApplicationContext())
              .getReactNativeHost()
              .getReactInstanceManager()
              .getDevSupportManager();

      devSupportManager.addCustomDevOption("Toggle slow animations (Reanimated)", handler);
    }
  }
}
