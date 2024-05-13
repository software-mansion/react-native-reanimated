package com.swmansion.reanimated;

public class DevMenuUtils {

    private void addDevMenuOption(ReactApplicationContext context, , DevOptionHandler handler) {
    // In Expo, `ApplicationContext` is not an instance of `ReactApplication`
    if (context.get().getApplicationContext() instanceof ReactApplication) {
      final DevSupportManager devSupportManager =
          ((ReactApplication) context.get().getApplicationContext())
              .getReactNativeHost()
              .getReactInstanceManager()
              .getDevSupportManager();

      devSupportManager.addCustomDevOption(
          "Toggle slow animations (Reanimated)", handler);
    }
  }
}
