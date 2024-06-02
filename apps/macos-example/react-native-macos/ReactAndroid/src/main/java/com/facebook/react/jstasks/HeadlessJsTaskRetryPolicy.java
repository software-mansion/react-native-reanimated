/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.react.jstasks;

import javax.annotation.CheckReturnValue;

public interface HeadlessJsTaskRetryPolicy {

  boolean canRetry();

  int getDelay();

  @CheckReturnValue
  HeadlessJsTaskRetryPolicy update();

  HeadlessJsTaskRetryPolicy copy();
}
