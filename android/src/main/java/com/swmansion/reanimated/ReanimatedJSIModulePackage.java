package com.swmansion.reanimated;

import android.util.Log;
import com.facebook.react.bridge.JSIModulePackage;
import com.facebook.react.bridge.JSIModuleSpec;
import com.facebook.react.bridge.JavaScriptContextHolder;
import com.facebook.react.bridge.ReactApplicationContext;
import java.util.Arrays;
import java.util.List;

public class ReanimatedJSIModulePackage implements JSIModulePackage {

  @Override
  public List<JSIModuleSpec> getJSIModules(
      ReactApplicationContext reactApplicationContext, JavaScriptContextHolder jsContext) {

    // When debugging in chrome the JS context is not available.
    // https://github.com/facebook/react-native/blob/v0.67.0-rc.6/ReactAndroid/src/main/java/com/facebook/react/modules/blob/BlobCollector.java#L25
    Utils.isChromeDebugger = jsContext.get() == 0;

    if (!Utils.isChromeDebugger) {
      NodesManager nodesManager =
          reactApplicationContext.getNativeModule(ReanimatedModule.class).getNodesManager();
      nodesManager.initWithContext(reactApplicationContext);
    } else {
      Log.w(
          "[REANIMATED]",
          "Unable to create Reanimated Native Module. You can ignore this message if you are using Chrome Debugger now.");
    }
    return Arrays.<JSIModuleSpec>asList();
  }
}
