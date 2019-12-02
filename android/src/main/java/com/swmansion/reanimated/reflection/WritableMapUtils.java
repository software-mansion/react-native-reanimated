package com.swmansion.reanimated.reflection;

import com.facebook.react.bridge.Dynamic;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import static com.swmansion.reanimated.reflection.ReflectionUtils.isInteger;
import static com.swmansion.reanimated.reflection.ReflectionUtils.toDouble;

public class WritableMapUtils {
    static String resolveKey(Object key) {
        return String.valueOf(key);
    }

    static WritableMap putVariant(WritableMap map, String key, Object o){
        if (o instanceof Dynamic) {
            putDynamic(map, key, ((Dynamic) o));
        } else {
            switch(ReflectionUtils.inferType(o)){
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
        }

        return map;
    }

    static WritableMap putDynamic(WritableMap map, String key, Dynamic o){
        switch(o.getType()){
            case Array:
                map.putArray(key, o.asArray());
                break;
            case Map:
                map.putMap(key, o.asMap());
                break;
            case Null:
                map.putNull(key);
                break;
            case Number:
                map.putDouble(key, o.asDouble());
                break;
            case String:
                map.putString(key, o.asString());
                break;
            case Boolean:
                map.putBoolean(key, o.asBoolean());
                break;
        }

        return map;
    }

    static WritableMap addAll(WritableMap to, ReadableArray from) {
        Dynamic dynamic;
        for (int i = 0; i < from.size(); i++) {
            dynamic =  from.getDynamic(i);
            putDynamic(to, String.valueOf(i), dynamic);
            dynamic.recycle();
        }

        return to;
    }
}
