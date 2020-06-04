package com.swmansion.reanimated.example;

import android.app.Application;
import android.content.Context;
import android.util.Log;

import androidx.annotation.Nullable;

import com.facebook.react.ReactApplication;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.JSIModule;
import com.facebook.react.bridge.JSIModulePackage;
import com.facebook.react.bridge.JSIModuleProvider;
import com.facebook.react.bridge.JSIModuleSpec;
import com.facebook.react.bridge.JSIModuleType;
import com.facebook.react.bridge.JavaScriptContextHolder;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.config.ReactFeatureFlags;
import com.facebook.react.shell.MainReactPackage;
import com.facebook.react.turbomodule.core.interfaces.TurboModule;
import com.facebook.react.turbomodule.core.interfaces.TurboModuleRegistry;
import com.facebook.soloader.SoLoader;
import com.horcrux.svg.SvgPackage;
import com.swmansion.gesturehandler.react.RNGestureHandlerPackage;
import com.swmansion.reanimated.NativeProxy;
import com.swmansion.reanimated.ReanimatedJSIModulePackage;
import com.swmansion.reanimated.ReanimatedModule;
import com.swmansion.reanimated.ReanimatedPackage;

import org.reactnative.maskedview.RNCMaskedViewPackage;

import java.lang.reflect.InvocationTargetException;
import java.util.Arrays;
import java.util.Collection;
import java.util.List;


public class MainApplication extends Application implements ReactApplication {

  static {
    ReactFeatureFlags.useTurboModules = true;
  }

  private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {
    @Override
    public boolean getUseDeveloperSupport() {
      return BuildConfig.DEBUG;
    }

    @Override
    protected List<ReactPackage> getPackages() {
      return Arrays.<ReactPackage>asList(
          new MainReactPackage(),
            new RNCMaskedViewPackage(),
            new SvgPackage(),
          new ReanimatedPackage(),
          new RNGestureHandlerPackage()
      );
    }

    @Override
    protected String getJSMainModuleName() {
      return "index";
    }

    @Nullable
    @Override
    protected JSIModulePackage getJSIModulePackage() {
      return new ReanimatedJSIModulePackage();
    }
  };

  @Override
  public ReactNativeHost getReactNativeHost() {
    return mReactNativeHost;
  }

  @Override
  public void onCreate() {
    super.onCreate();
    SoLoader.init(this, /* native exopackage */ false);
    initializeFlipper(this, getReactNativeHost().getReactInstanceManager());
  }

  private static void initializeFlipper(
          Context context, ReactInstanceManager reactInstanceManager) {
    if (BuildConfig.DEBUG) {
      try {
        /*
         We use reflection here to pick up the class that initializes Flipper,
        since Flipper library is not available in release mode
        */
        Class<?> aClass = Class.forName("com.reanimated.example.ReactNativeFlipper");
        aClass
                .getMethod("initializeFlipper", Context.class, ReactInstanceManager.class)
                .invoke(null, context, reactInstanceManager);
      } catch (ClassNotFoundException e) {
        e.printStackTrace();
      } catch (NoSuchMethodException e) {
        e.printStackTrace();
      } catch (IllegalAccessException e) {
        e.printStackTrace();
      } catch (InvocationTargetException e) {
        e.printStackTrace();
      }
    }
  }
}
