package com.swmansion.reanimated;

import androidx.annotation.NonNull;

import com.facebook.jni.HybridData;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.facebook.react.bridge.ReadableNativeArray;
import com.facebook.react.bridge.ReadableNativeMap;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeArray;
import com.facebook.react.bridge.WritableNativeMap;

import java.util.HashMap;
import java.util.Map;

public class Utils {

  public static Map<String, Integer> processMapping(ReadableMap style) {
    ReadableMapKeySetIterator iter = style.keySetIterator();
    HashMap<String, Integer> mapping = new HashMap<>();
    while (iter.hasNextKey()) {
      String propKey = iter.nextKey();
      int nodeIndex = style.getInt(propKey);
      mapping.put(propKey, nodeIndex);
    }
    return mapping;
  }

  public static int[] processIntArray(ReadableArray ary) {
    int size = ary.size();
    int[] res = new int[size];
    for (int i = 0; i < size; i++) {
      res[i] = ary.getInt(i);
    }
    return res;
  }

  private static Boolean isNumber(Object o){
    return o instanceof Number;
  }

  private static Boolean isString(Object o){
    return o instanceof String;
  }

  private static Boolean isBoolean(Object o){
    return o instanceof Boolean;
  }

  private static Boolean isNull(Object o){
    return o == null;
  }

  private static Boolean isArray(Object o){
    return o.getClass().isArray();
  }

  public static ReadableType inferType(Object o){
    if(isNull(o)){
      return ReadableType.Null;
    } else if(isNumber(o)){
      return ReadableType.Number;
    } else if(isString(o)){
      return ReadableType.String;
    } else if(isBoolean(o)){
      return ReadableType.Boolean;
    } else if(isArray(o)){
      return ReadableType.Array;
    } else {
      return ReadableType.Map;
    }
  }

  public static WritableMap putVariant(WritableMap map, String key, Object o){
    switch(inferType(o)){
      case Array:
        map.putArray(key, ((WritableArray) o));
        break;
      case Map:
        map.putMap(key, ((WritableMap) o));
        break;
      case Null:
        map.putNull(key);
        break;
      case Number:
        map.putDouble(key, ((Double) o));
        break;
      case String:
        map.putString(key, ((String) o));
        break;
      case Boolean:
        map.putBoolean(key, ((Boolean) o));
        break;
    }

    return map;
  }

  public static WritableArray pushVariant(WritableArray arr, Object o){
    switch(inferType(o)){
      case Array:
        arr.pushArray(((WritableArray) o));
        break;
      case Map:
        arr.pushMap(((WritableMap) o));
        break;
      case Null:
        arr.pushNull();
        break;
      case Number:
        arr.pushDouble(((Double) o));
        break;
      case String:
        arr.pushString(((String) o));
        break;
      case Boolean:
        arr.pushBoolean(((Boolean) o));
        break;
    }

    return arr;
  }

  public static WritableArray toWritableArray(Object... params){
    WritableArray arr = Arguments.createArray();
    for (int i = 0; i < params.length; i++) {
      pushVariant(arr, params[i]);
    }
    return arr;
  }

  public static class ReanimatedReadableNativeMap extends ReadableNativeMap {
    ReanimatedReadableNativeMap(HybridData hybridData){
      super(hybridData);
    }

    @Override
    public boolean getBoolean(@NonNull String name) {
      return super.getDouble(name) == 1;
    }
  }

  public static class ReanimatedWritableNativeMap extends WritableNativeMap {
    @Override
    public boolean getBoolean(@NonNull String name) {
      return super.getDouble(name) == 1;
    }
  }

  public static class ReanimatedReadableNativeArray extends ReadableNativeArray {
    ReanimatedReadableNativeArray(HybridData hybridData){
      super(hybridData);
    }

    @Override
    public boolean getBoolean(int index) {
      return super.getDouble(index) == 1;
    }
  }

  public static class ReanimatedWritableNativeArray extends WritableNativeArray {
    @Override
    public boolean getBoolean(int index) {
      return super.getDouble(index) == 1;
    }
  }
}
