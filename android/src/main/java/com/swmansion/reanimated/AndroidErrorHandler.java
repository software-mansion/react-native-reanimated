package com.swmansion.reanimated;

public class AndroidErrorHandler {
  private static String mMessage;

  public static void setMessage(String message) {
    mMessage = message;
  }

  public static void raise() {
    // For some reason, it crashes with "JNI GetObjectRefType called with pending exception"
    // if we pass error message as an argument to this method.
    throw new RuntimeException(mMessage);
  }
}
