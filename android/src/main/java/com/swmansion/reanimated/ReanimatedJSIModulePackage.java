package com.swmansion.reanimated;

import com.facebook.react.bridge.JSIModulePackage;
import com.facebook.react.bridge.JSIModuleProvider;
import com.facebook.react.bridge.JSIModuleSpec;
import com.facebook.react.bridge.JSIModuleType;
import com.facebook.react.bridge.JavaScriptContextHolder;
import com.facebook.react.bridge.ReactApplicationContext;

import java.util.Arrays;
import java.util.List;

public class ReanimatedJSIModulePackage implements JSIModulePackage {

  private static class NativeProxyProvider implements JSIModuleProvider<NativeProxy> {

    private final ReactApplicationContext mContext;

    private NativeProxyProvider(ReactApplicationContext context) {
      mContext = context;
    }

    @Override
    public NativeProxy get() {
      return new NativeProxy(mContext);
    }
  }

  private static class ModuleSpec implements JSIModuleSpec<NativeProxy> {

    private final ReactApplicationContext mContext;

    private ModuleSpec(ReactApplicationContext context) {
      mContext = context;
    }

    @Override
    public JSIModuleType getJSIModuleType() {
      return JSIModuleType.TurboModuleManager;
    }

    @Override
    public JSIModuleProvider getJSIModuleProvider() {
      return new NativeProxyProvider(mContext);
    }
  }

  @Override
  public List<JSIModuleSpec> getJSIModules(ReactApplicationContext reactApplicationContext, JavaScriptContextHolder jsContext) {
    return Arrays.<JSIModuleSpec>asList(new ModuleSpec(reactApplicationContext));
  }
}
