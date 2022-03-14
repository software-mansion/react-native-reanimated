package com.swmansion.reanimated;

import com.facebook.react.bridge.JavaScriptContextHolder;
import com.facebook.react.bridge.ReactApplicationContext;

public class EXReanimatedAdapter {
  public static void registerJSIModules(ReactApplicationContext reactApplicationContext, JavaScriptContextHolder jsContext) {
    NodesManager nodesManager =
      reactApplicationContext.getNativeModule(ReanimatedModule.class).getNodesManager();
    nodesManager.initWithContext(reactApplicationContext);
  }
}
