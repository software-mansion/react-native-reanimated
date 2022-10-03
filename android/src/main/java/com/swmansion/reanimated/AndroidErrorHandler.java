package com.swmansion.reanimated;

public class AndroidErrorHandler {

  public static void raise(String message) {
    throw new RuntimeException(message);
  }
}
