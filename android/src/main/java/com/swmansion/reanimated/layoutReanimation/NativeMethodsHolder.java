package com.swmansion.reanimated.layoutReanimation;

import java.util.HashMap;

public interface NativeMethodsHolder {
  void startAnimationForTag(int tag, String type, HashMap<String, Float> values);
  boolean isLayoutAnimationEnabled();
}
