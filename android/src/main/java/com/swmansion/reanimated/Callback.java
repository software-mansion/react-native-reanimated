package com.swmansion.reanimated;

public class Callback {
  private long mCallbackPtr;
  private long mRuntimePtr;

  public Callback(final long runtimePtr, final long callbackPtr) {
    mCallbackPtr = callbackPtr;
    mRuntimePtr = runtimePtr;
  }

  public void invoke(Object value) {
    Class valueClass = value.getClass();
    String arg = "";

    if (valueClass == Integer.class) {
      arg = String.valueOf(((Integer) value).doubleValue());
    } else if (valueClass == Double.class) {
      arg = String.valueOf(((Double) value).doubleValue());
    } else if (valueClass == Float.class) {
      arg = String.valueOf(((Float) value).doubleValue());
    } else if (valueClass == String.class) {
      arg = value.toString();
    }

    nativeInvoke(mRuntimePtr, mCallbackPtr, arg);
  }

  private native void nativeInvoke(long runtimePtr, long callbackPtr, String value);
}
