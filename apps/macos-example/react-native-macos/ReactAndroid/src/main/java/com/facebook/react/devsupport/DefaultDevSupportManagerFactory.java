/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.react.devsupport;

import android.content.Context;
import androidx.annotation.Nullable;
import com.facebook.react.common.SurfaceDelegateFactory;
import com.facebook.react.devsupport.interfaces.DevBundleDownloadListener;
import com.facebook.react.devsupport.interfaces.DevLoadingViewManager;
import com.facebook.react.devsupport.interfaces.DevSupportManager;
import com.facebook.react.devsupport.interfaces.RedBoxHandler;
import com.facebook.react.packagerconnection.RequestHandler;
import java.lang.reflect.Constructor;
import java.util.Map;

/**
 * A simple factory that creates instances of {@link DevSupportManager} implementations. Uses
 * reflection to create BridgeDevSupportManager if it exists. This allows ProGuard to strip that
 * class and its dependencies in release builds. If the class isn't found, {@link
 * DisabledDevSupportManager} is returned instead.
 */
public class DefaultDevSupportManagerFactory implements DevSupportManagerFactory {

  private static final String DEVSUPPORT_IMPL_PACKAGE = "com.facebook.react.devsupport";
  private static final String DEVSUPPORT_IMPL_CLASS = "BridgeDevSupportManager";

  /** @deprecated in favor of the customisable create for DevSupportManagerFactory */
  @Deprecated
  public DevSupportManager create(
      Context applicationContext,
      ReactInstanceDevHelper reactInstanceDevHelper,
      @Nullable String packagerPathForJSBundleName,
      boolean enableOnCreate,
      int minNumShakes) {

    return create(
        applicationContext,
        reactInstanceDevHelper,
        packagerPathForJSBundleName,
        enableOnCreate,
        null,
        null,
        minNumShakes,
        null,
        null,
        null);
  }

  @Override
  public DevSupportManager create(
      Context applicationContext,
      ReactInstanceDevHelper reactInstanceManagerHelper,
      @Nullable String packagerPathForJSBundleName,
      boolean enableOnCreate,
      @Nullable RedBoxHandler redBoxHandler,
      @Nullable DevBundleDownloadListener devBundleDownloadListener,
      int minNumShakes,
      @Nullable Map<String, RequestHandler> customPackagerCommandHandlers,
      @Nullable SurfaceDelegateFactory surfaceDelegateFactory,
      @Nullable DevLoadingViewManager devLoadingViewManager) {
    if (!enableOnCreate) {
      return new DisabledDevSupportManager();
    }
    // Developer support is enabled, we now must choose whether to return a DevSupportManager,
    // or a more lean profiling-only PerftestDevSupportManager. We make the choice by first
    // trying to return the full support DevSupportManager and if it fails, then just
    // return PerftestDevSupportManager.
    try {
      // ProGuard is surprisingly smart in this case and will keep a class if it detects a call to
      // Class.forName() with a static string. So instead we generate a quasi-dynamic string to
      // confuse it.
      String className =
          new StringBuilder(DEVSUPPORT_IMPL_PACKAGE)
              .append(".")
              .append(DEVSUPPORT_IMPL_CLASS)
              .toString();
      Class<?> devSupportManagerClass = Class.forName(className);
      Constructor constructor =
          devSupportManagerClass.getConstructor(
              Context.class,
              ReactInstanceDevHelper.class,
              String.class,
              boolean.class,
              RedBoxHandler.class,
              DevBundleDownloadListener.class,
              int.class,
              Map.class,
              SurfaceDelegateFactory.class,
              DevLoadingViewManager.class);
      return (DevSupportManager)
          constructor.newInstance(
              applicationContext,
              reactInstanceManagerHelper,
              packagerPathForJSBundleName,
              true,
              redBoxHandler,
              devBundleDownloadListener,
              minNumShakes,
              customPackagerCommandHandlers,
              surfaceDelegateFactory,
              devLoadingViewManager);
    } catch (Exception e) {
      return new PerftestDevSupportManager(applicationContext);
    }
  }
}
