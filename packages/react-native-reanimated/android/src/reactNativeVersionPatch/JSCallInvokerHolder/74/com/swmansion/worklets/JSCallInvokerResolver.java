package com.swmansion.worklets;

import androidx.annotation.OptIn;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.common.annotations.FrameworkAPI;
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl;

public class JSCallInvokerResolver {

  @OptIn(markerClass = FrameworkAPI.class)
  public static CallInvokerHolderImpl getJSCallInvokerHolder(ReactApplicationContext context) {
    return (CallInvokerHolderImpl) context.getCatalystInstance().getJSCallInvokerHolder();
  }
}
