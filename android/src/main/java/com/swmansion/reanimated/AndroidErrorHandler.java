package com.swmansion.reanimated;

public class AndroidErrorHandler {

  public static void raise() {
    throw new RuntimeException("Something went wrong.");
  }
}
