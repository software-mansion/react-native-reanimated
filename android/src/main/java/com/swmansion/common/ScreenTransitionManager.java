package com.swmansion.common;

import com.facebook.react.bridge.WritableArray;
import javax.annotation.Nullable;

public interface ScreenTransitionManager {
  WritableArray startTransition(@Nullable Double reactTag);

  boolean updateTransition(@Nullable Double reactTag, double progress);

  boolean finishTransition(@Nullable Double reactTag, boolean canceled);
}
