/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.react.bridge;

import androidx.annotation.Nullable;

/** Interface for a mutable array. Used to pass arguments from Java to JS. */
public interface WritableArray extends ReadableArray {

  void pushNull();

  void pushBoolean(boolean value);

  void pushDouble(double value);

  void pushInt(int value);

  void pushString(@Nullable String value);

  void pushArray(@Nullable ReadableArray array);

  void pushMap(@Nullable ReadableMap map);
}
