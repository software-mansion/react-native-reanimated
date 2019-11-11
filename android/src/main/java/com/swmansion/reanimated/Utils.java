package com.swmansion.reanimated;

import androidx.annotation.NonNull;
import androidx.annotation.StringDef;

import com.facebook.jni.HybridData;
import com.facebook.react.bridge.Dynamic;
import com.facebook.react.bridge.JSApplicationIllegalArgumentException;
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

import java.lang.annotation.Retention;
import java.util.HashMap;
import java.util.Map;

import static java.lang.annotation.RetentionPolicy.SOURCE;

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

  public static Boolean isNumber(Object o){
    return o instanceof Number ||
            o.equals(int.class) || o.equals(Integer.class) ||
            o.equals(float.class) || o.equals(Float.class) ||
            o.equals(double.class) || o.equals(Double.class) ||
            o.equals(long.class) || o.equals(Long.class) ||
            o.equals(short.class) || o.equals(Short.class);
  }

  public static Boolean isInteger(Object o){
    return o instanceof Integer || o.equals(int.class) || o.equals(Integer.class);
  }

  public static Boolean isString(Object o){
    return o instanceof String || o.equals(String.class);
  }

  public static Boolean isBoolean(Object o){
    return o instanceof Boolean || o.equals(boolean.class) || o.equals(Boolean.class);
  }

  public static Boolean isNull(Object o){
    return o == null;
  }

  public static Boolean isArray(Object o){
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
        if (isInteger(o)){
          map.putInt(key, ((Integer) o));
        } else {
          map.putDouble(key, toDouble(o));
        }
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
        if (isInteger(o)){
          arr.pushInt((Integer) o);
        } else {
          arr.pushDouble(toDouble(o));
        }
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

  public static WritableMap toFakeWritableArray(Object... params){
    WritableMap arr = new ReanimatedWritableNativeMap();
    for (int i = 0; i < params.length; i++) {
      putVariant(arr, String.valueOf(i), params[i]);
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

    @Override
    public double getDouble(@NonNull String name) {
      return super.getType(name) == ReadableType.Boolean ?
              toDouble(super.getBoolean(name)) :
              super.getDouble(name);
    }
  }

  public static class ReanimatedWritableNativeMap extends WritableNativeMap {
    @Override
    public boolean getBoolean(@NonNull String name) {
      return super.getDouble(name) == 1;
    }

    @Override
    public double getDouble(@NonNull String name) {
      return super.getType(name) == ReadableType.Boolean ?
              toDouble(super.getBoolean(name)) :
              super.getDouble(name);
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

    @Override
    public double getDouble(int index) {
      return super.getType(index) == ReadableType.Boolean ?
              toDouble(super.getBoolean(index)) :
              super.getDouble(index);
    }
  }

  public static class ReanimatedWritableNativeArray extends WritableNativeArray {
    @Override
    public boolean getBoolean(int index) {
      return super.getDouble(index) == 1;
    }

    @Override
    public double getDouble(int index) {
      return super.getType(index) == ReadableType.Boolean ?
              toDouble(super.getBoolean(index)) :
              super.getDouble(index);
    }
  }


  @StringDef({
          PrimitiveNumber.BYTE,
          PrimitiveNumber.INT,
          PrimitiveNumber.FLOAT,
          PrimitiveNumber.LONG,
          PrimitiveNumber.SHORT,
          PrimitiveNumber.BOOLEAN,
  })
  @Retention(SOURCE)
  public @interface PrimitiveNumber {
    String BYTE = "byte";
    String INT = "int";
    String FLOAT = "float";
    String LONG = "long";
    String SHORT = "short";
    String BOOLEAN = "boolean";
  }

  public static <T extends Object> T fromDouble(Double value, Class<T> clazz){
    switch (clazz.getName()){
      case PrimitiveNumber.BYTE: return ((T) Byte.valueOf(value.byteValue()));
      case PrimitiveNumber.INT: return ((T) Integer.valueOf(value.intValue()));
      case PrimitiveNumber.FLOAT: return ((T) Float.valueOf(value.floatValue()));
      case PrimitiveNumber.LONG: return ((T) Long.valueOf(value.longValue()));
      case PrimitiveNumber.SHORT: return ((T) Short.valueOf(value.shortValue()));
      case PrimitiveNumber.BOOLEAN: return ((T) Boolean.valueOf(value == 1));
      default: return ((T) value);
    }
  }

  public static <T> T fromDynamic(Dynamic value) {
    switch (((Dynamic) value).getType()) {
      case Boolean:
        return ((T) toDouble(value.asBoolean()));
      case Null:
        return ((T) toDouble(0.));
      case Number:
        return ((T) toDouble(value.asDouble()));
      case String:
        return ((T) value.asString());
      default:
        throw new JSApplicationIllegalArgumentException(
                "Can not cast " + value + " of type " + value.getType() +
                        " into " + Double.class.getName()
        );
    }
  }
  
  public static Double toDouble(Object value) {
    Object o = value;
    if (value instanceof Dynamic){
      switch (((Dynamic) value).getType()) {
        case Boolean:
          o = ((Dynamic) value).asBoolean();
          break;
        case Null:
          o = 0;
          break;
        case Number:
          o = ((Dynamic) value).asDouble();
          break;
          default:
            throw new JSApplicationIllegalArgumentException(
                    "Can not cast" + value + " of type " + ((Dynamic) value).getType() +
                            " into " + Double.class.getName()
            );
      }
    }

    if(isBoolean(o)) {
      return Double.valueOf(((Boolean) o) ? 1 : 0);
    } else if (o instanceof Number){
      return Double.valueOf(((Number) o).doubleValue());
    } else {
      return Double.valueOf((double) o);
    }
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
    String concat = "";
    for (int i = 0; i < args.length; i++) {
      concat += args[i].toString();
      if(i < args.length - 1) concat += separator;
    }
    return concat;
  }
}
