package com.swmansion.reanimated;

public class NativeProxy {

  static {
    System.loadLibrary("reanimated");
  }

  private static NativeProxy mInstance = null;

  private NativeProxy() {}

  public synchronized static NativeProxy getInstance() {
    if (mInstance == null) {
      mInstance = new NativeProxy();
    }
    return mInstance;
  }

  public native void install(long runtimePtr);
}
