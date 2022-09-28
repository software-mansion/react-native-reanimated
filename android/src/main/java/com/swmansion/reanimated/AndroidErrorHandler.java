package com.swmansion.reanimated;

import android.util.Log;

public class AndroidErrorHandler {

  public static void raise(String message) {
    Log.e("Reanimated", message);
    // throw new RuntimeException(message);
  }
}
