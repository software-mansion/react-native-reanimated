/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.react.uimanager;

import com.facebook.yoga.YogaConfig;
import com.facebook.yoga.YogaConfigFactory;
import com.facebook.yoga.YogaErrata;

public class ReactYogaConfigProvider {

  private static YogaConfig YOGA_CONFIG;

  public static YogaConfig get() {
    if (YOGA_CONFIG == null) {
      YOGA_CONFIG = YogaConfigFactory.create();
      YOGA_CONFIG.setPointScaleFactor(0f);
      YOGA_CONFIG.setErrata(YogaErrata.ALL);
    }
    return YOGA_CONFIG;
  }
}
