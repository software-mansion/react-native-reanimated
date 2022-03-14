package expo.modules.adapters.reanimated;

import android.content.Context;

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
      public void onRegisterJSIModules(ReactApplicationContext reactApplicationContext, JavaScriptContextHolder jsContext, boolean useDeveloperSupport) {
        EXReanimatedAdapter.registerJSIModules(reactApplicationContext, jsContext);
      }
    };
    return Collections.singletonList(handler);
  }
}
