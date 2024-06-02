/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.react;

import com.facebook.react.bridge.ModuleHolder;
import com.facebook.react.bridge.NativeModuleRegistry;
import com.facebook.react.bridge.ReactApplicationContext;
import java.util.HashMap;
import java.util.Map;

/** Helper class to build NativeModuleRegistry. */
public class NativeModuleRegistryBuilder {

  private final ReactApplicationContext mReactApplicationContext;
  private final ReactInstanceManager mReactInstanceManager;

  private final Map<String, ModuleHolder> mModules = new HashMap<>();

  public NativeModuleRegistryBuilder(
      ReactApplicationContext reactApplicationContext, ReactInstanceManager reactInstanceManager) {
    mReactApplicationContext = reactApplicationContext;
    mReactInstanceManager = reactInstanceManager;
  }

  public void processPackage(ReactPackage reactPackage) {
    // We use an iterable instead of an iterator here to ensure thread safety, and that this list
    // cannot be modified
    Iterable<ModuleHolder> moduleHolders;
    if (reactPackage instanceof LazyReactPackage) {
      moduleHolders =
          ((LazyReactPackage) reactPackage).getNativeModuleIterator(mReactApplicationContext);
    } else if (reactPackage instanceof TurboReactPackage) {
      moduleHolders =
          ((TurboReactPackage) reactPackage).getNativeModuleIterator(mReactApplicationContext);
    } else {
      moduleHolders =
          ReactPackageHelper.getNativeModuleIterator(
              reactPackage, mReactApplicationContext, mReactInstanceManager);
    }

    for (ModuleHolder moduleHolder : moduleHolders) {
      String name = moduleHolder.getName();
      if (mModules.containsKey(name)) {
        ModuleHolder existingNativeModule = mModules.get(name);
        if (!moduleHolder.getCanOverrideExistingModule()) {
          throw new IllegalStateException(
              "Native module "
                  + name
                  + " tried to override "
                  + existingNativeModule.getClassName()
                  + ". Check the getPackages() method in MainApplication.java, it might be that module is being created twice. If this was your intention, set canOverrideExistingModule=true. "
                  + "This error may also be present if the package is present only once in getPackages() but is also automatically added later during build time by autolinking. Try removing the existing entry and rebuild.");
        }
        mModules.remove(existingNativeModule);
      }
      mModules.put(name, moduleHolder);
    }
  }

  public NativeModuleRegistry build() {
    return new NativeModuleRegistry(mReactApplicationContext, mModules);
  }
}
