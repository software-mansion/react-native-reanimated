/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.react.module.annotations;

import static java.lang.annotation.ElementType.TYPE;
import static java.lang.annotation.RetentionPolicy.SOURCE;

import com.facebook.react.bridge.NativeModule;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

/**
 * Annotates a function that returns a list of ModuleSpecs from which we get a list of NativeModules
 * to create ReactModuleInfos from.
 */
@Retention(SOURCE)
@Target(TYPE)
public @interface ReactModuleList {

  /**
   * The Native modules in this list should be annotated with {@link ReactModule}.
   *
   * @return List of Native modules in the package.
   */
  Class<? extends NativeModule>[] nativeModules();
}
