package expo.modules.adapters.reanimated;

import android.content.Context;

import com.facebook.react.ReactInstanceManager;
import com.facebook.react.bridge.JavaScriptContextHolder;
import com.facebook.react.bridge.ReactApplicationContext;
import com.swmansion.reanimated.EXReanimatedAdapter;

import java.util.Collections;
import java.util.List;

import expo.modules.core.interfaces.Package;
import expo.modules.core.interfaces.ReactNativeHostHandler;

public class EXReanimatedPackage implements Package {
  @Override
  public List<? extends ReactNativeHostHandler> createReactNativeHostHandlers(Context context) {
    final ReactNativeHostHandler handler = new ReactNativeHostHandler() {
      @Override
      public ReactInstanceManager createReactInstanceManager(boolean useDeveloperSupport) {
        return null;
      }

      @Override
      public String getJSBundleFile(boolean useDeveloperSupport) {
        return null;
      }

      @Override
      public String getBundleAssetName(boolean useDeveloperSupport) {
        return null;
      }

      @Override
      public void onRegisterJSIModules(ReactApplicationContext reactApplicationContext, JavaScriptContextHolder jsContext, boolean useDeveloperSupport) {
        EXReanimatedAdapter.registerJSIModules(reactApplicationContext, jsContext);
      }

      @Override
      public void onBeforeCreateReactInstanceManager(boolean useDeveloperSupport) {

      }

      @Override
      public void onDidCreateReactInstanceManager(boolean useDeveloperSupport) {

      }
    };
    return Collections.singletonList(handler);
  }
}
