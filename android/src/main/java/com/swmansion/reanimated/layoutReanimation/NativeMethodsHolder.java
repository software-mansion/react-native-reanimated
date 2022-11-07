package com.swmansion.reanimated.layoutReanimation;

import java.util.HashMap;

public interface NativeMethodsHolder {
  void startAnimation(int tag, String type, HashMap<String, Float> values);

  boolean hasAnimation(int tag, String type);

  void clearAnimationConfig(int tag);

  boolean isLayoutAnimationEnabled();
}
