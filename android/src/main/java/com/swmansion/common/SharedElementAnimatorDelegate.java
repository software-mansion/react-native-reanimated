package com.swmansion.common;

import android.view.View;

public interface SharedElementAnimatorDelegate {
  void runTransition(View before, View after);
}
