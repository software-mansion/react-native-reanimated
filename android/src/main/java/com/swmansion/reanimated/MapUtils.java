package com.swmansion.reanimated;

import com.facebook.react.bridge.Dynamic;
import com.facebook.react.bridge.JSApplicationCausedNativeException;
import com.facebook.react.bridge.NoSuchKeyException;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;

public class MapUtils {

  public static boolean getBoolean(ReadableMap map,  @Nonnull String name, String errorMsg) {
    try {
      return map.getBoolean(name);
    } catch (NoSuchKeyException e) {
      throw new JSApplicationCausedNativeException(errorMsg);
    }
  }

  public static double getDouble(ReadableMap map,  @Nonnull String name, String errorMsg) {
    try {
      return map.getDouble(name);
    } catch (NoSuchKeyException e) {
      throw new JSApplicationCausedNativeException(errorMsg);
    }
  }

  public static int getInt(ReadableMap map,  @Nonnull String name, String errorMsg) {
    try {
      return map.getInt(name);
    } catch (NoSuchKeyException e) {
      throw new JSApplicationCausedNativeException(errorMsg);
    }
  }

  @Nullable
  public static String getString(ReadableMap map,  @Nonnull String name, String errorMsg) {
    try {
      return map.getString(name);
    } catch (NoSuchKeyException e) {
      throw new JSApplicationCausedNativeException("Reanimated: " + errorMsg);
    }
  }

  @Nullable
  public static ReadableArray getArray(ReadableMap map,  @Nonnull String name, String errorMsg) {
    try {
      return map.getArray(name);
    } catch (NoSuchKeyException e) {
      throw new JSApplicationCausedNativeException(errorMsg);
    }
  }

  @Nullable
  public static ReadableMap getMap(ReadableMap map,  @Nonnull String name, String errorMsg) {
    try {
      return map.getMap(name);
    } catch (NoSuchKeyException e) {
      throw new JSApplicationCausedNativeException(errorMsg);
    }
  }

  @Nonnull
  public static Dynamic getDynamic(ReadableMap map,  @Nonnull String name, String errorMsg) {
    try {
      return map.getDynamic(name);
    } catch (NoSuchKeyException e) {
      throw new JSApplicationCausedNativeException(errorMsg);
    }
  }
}
