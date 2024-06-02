/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.react.turbomodule.core;

import androidx.annotation.Nullable;
import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.turbomodule.core.interfaces.TurboModule;
import java.util.ArrayList;
import java.util.List;

public abstract class TurboModuleManagerDelegate {
  @DoNotStrip
  @SuppressWarnings("unused")
  private final HybridData mHybridData;

  static {
    NativeModuleSoLoader.maybeLoadSoLibrary();
  }

  protected abstract HybridData initHybrid();

  protected TurboModuleManagerDelegate() {
    maybeLoadOtherSoLibraries();
    mHybridData = initHybrid();
  }

  /**
   * Create and return a TurboModule Java object with name `moduleName`. If `moduleName` isn't a
   * TurboModule, return null.
   */
  @Nullable
  public abstract TurboModule getModule(String moduleName);

  public abstract boolean unstable_isModuleRegistered(String moduleName);

  /**
   * Create an return a legacy NativeModule with name `moduleName`. If `moduleName` is a
   * TurboModule, return null.
   */
  @Nullable
  public NativeModule getLegacyModule(String moduleName) {
    return null;
  }

  public boolean unstable_isLegacyModuleRegistered(String moduleName) {
    return false;
  };

  public List<String> getEagerInitModuleNames() {
    return new ArrayList<>();
  }

  /** Can the TurboModule system create legacy modules? */
  public boolean unstable_shouldEnableLegacyModuleInterop() {
    return false;
  }

  /**
   * Should the TurboModule system treat all turbo native modules as though they were legacy
   * modules? This method is for testing purposes only.
   */
  public boolean unstable_shouldRouteTurboModulesThroughLegacyModuleInterop() {
    return false;
  }

  protected synchronized void maybeLoadOtherSoLibraries() {}
}
