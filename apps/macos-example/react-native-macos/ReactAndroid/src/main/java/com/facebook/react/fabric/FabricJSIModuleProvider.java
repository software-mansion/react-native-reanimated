/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.react.fabric;

import androidx.annotation.NonNull;
import com.facebook.react.bridge.JSIModuleProvider;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.UIManager;
import com.facebook.react.fabric.events.EventBeatManager;
import com.facebook.react.uimanager.ViewManagerRegistry;
import com.facebook.systrace.Systrace;

public class FabricJSIModuleProvider implements JSIModuleProvider<UIManager> {

  @NonNull private final ReactApplicationContext mReactApplicationContext;
  @NonNull private final ComponentFactory mComponentFactory;
  @NonNull private final ReactNativeConfig mConfig;
  @NonNull private final ViewManagerRegistry mViewManagerRegistry;

  public FabricJSIModuleProvider(
      @NonNull ReactApplicationContext reactApplicationContext,
      @NonNull ComponentFactory componentFactory,
      @NonNull ReactNativeConfig config,
      @NonNull ViewManagerRegistry viewManagerRegistry) {
    mReactApplicationContext = reactApplicationContext;
    mComponentFactory = componentFactory;
    mConfig = config;
    mViewManagerRegistry = viewManagerRegistry;
  }

  @Override
  public UIManager get() {
    Systrace.beginSection(Systrace.TRACE_TAG_REACT_JAVA_BRIDGE, "FabricJSIModuleProvider.get");
    final EventBeatManager eventBeatManager = new EventBeatManager();
    final FabricUIManager uiManager = createUIManager(eventBeatManager);

    Systrace.beginSection(
        Systrace.TRACE_TAG_REACT_JAVA_BRIDGE, "FabricJSIModuleProvider.registerBinding");
    final Binding binding = new BindingImpl();

    binding.register(
        mReactApplicationContext.getCatalystInstance().getRuntimeExecutor(),
        mReactApplicationContext.getCatalystInstance().getRuntimeScheduler(),
        uiManager,
        eventBeatManager,
        mComponentFactory,
        mConfig);

    Systrace.endSection(Systrace.TRACE_TAG_REACT_JAVA_BRIDGE);
    Systrace.endSection(Systrace.TRACE_TAG_REACT_JAVA_BRIDGE);

    return uiManager;
  }

  private FabricUIManager createUIManager(@NonNull EventBeatManager eventBeatManager) {
    Systrace.beginSection(
        Systrace.TRACE_TAG_REACT_JAVA_BRIDGE, "FabricJSIModuleProvider.createUIManager");

    FabricUIManager fabricUIManager;
    fabricUIManager =
        new FabricUIManager(mReactApplicationContext, mViewManagerRegistry, eventBeatManager);
    Systrace.endSection(Systrace.TRACE_TAG_REACT_JAVA_BRIDGE);
    return fabricUIManager;
  }
}
