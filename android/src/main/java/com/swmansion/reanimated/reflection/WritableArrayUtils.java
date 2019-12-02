package com.swmansion.reanimated.reflection;

import com.facebook.react.bridge.Dynamic;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import static com.swmansion.reanimated.reflection.ReflectionUtils.isInteger;
import static com.swmansion.reanimated.reflection.ReflectionUtils.isString;
import static com.swmansion.reanimated.reflection.ReflectionUtils.toDouble;

public class WritableArrayUtils {

    static boolean isIndex(Object key) {
        return isInteger(key) || (isString(key) && ((String) key).matches("-?\\d"));
    }

    static int resolveIndex(Object key, int size) {
        return resolveIndex(key instanceof String ? Integer.valueOf((String) key) : ((int) key), size);
    }

    static int resolveIndex(int index, int size) {
        return index < 0 ? size + index : index;
    }

    static boolean indexInBounds(int index, int size) {
        return index >= 0 && index < size;
    }

    @SuppressWarnings("UnusedReturnValue")
    static WritableArray pushVariant(WritableArray arr, Object o) {
        if (o instanceof Dynamic) {
            pushDynamic(arr, ((Dynamic) o));
        } else {
            switch(ReflectionUtils.inferType(o)){
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
        }

        return arr;
    }

    @SuppressWarnings("UnusedReturnValue")
    private static WritableArray pushDynamic(WritableArray arr, Dynamic o){
        switch(o.getType()){
            case Array:
                arr.pushArray(o.asArray());
                break;
            case Map:
                arr.pushMap(o.asMap());
                break;
            case Null:
                arr.pushNull();
                break;
            case Number:
                arr.pushDouble(o.asDouble());
                break;
            case String:
                arr.pushString(o.asString());
                break;
            case Boolean:
                arr.pushBoolean(o.asBoolean());
                break;
        }

        return arr;
    }

    @SuppressWarnings("UnusedReturnValue")
    static ReadableArray addAll(WritableArray to, ReadableArray from) {
        Dynamic dynamic;
        for (int i = 0; i < from.size(); i++) {
            dynamic =  from.getDynamic(i);
            pushDynamic(to, dynamic);
            dynamic.recycle();
        }

        return to;
    }
}
