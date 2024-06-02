/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.react.turbomodule.core

import com.facebook.soloader.SoLoader

internal class NativeModuleSoLoader {
  companion object {
    private var isSoLibraryLoaded = false

    @Synchronized
    @JvmStatic
    fun maybeLoadSoLibrary() {
      if (!isSoLibraryLoaded) {
        SoLoader.loadLibrary("turbomodulejsijni")
        isSoLibraryLoaded = true
      }
    }
  }
}
