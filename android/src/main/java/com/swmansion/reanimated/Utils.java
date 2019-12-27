package com.swmansion.reanimated;

import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;

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

  public static String concat(int[] args){
    Object[] out = new Object[args.length];
    for (int i = 0; i < args.length; i++) {
      out[i] = args[i];
    }
    return concat(out, ", ");
  }

  public static String concat(Object[] args){
    return concat(args, ", ");
  }

  public static String concat(Object[] args, String separator){
    StringBuilder concat = new StringBuilder();
    for (int i = 0; i < args.length; i++) {
      concat.append(args[i].toString());
      if(i < args.length - 1) {
        concat.append(separator);
      }
    }
    return concat.toString();
  }
}
