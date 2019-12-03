package com.swmansion.reanimated.reflection;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.Dynamic;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import static com.swmansion.reanimated.reflection.ReflectionUtils.isInteger;
import static com.swmansion.reanimated.reflection.ReflectionUtils.toDouble;

public class WritableMapResolver implements ReadableCollection {

    private final WritableMap mSource;

    WritableMapResolver(WritableMap source) {
        mSource = source;
    }

    String resolveKey(Object key) {
        return String.valueOf(key);
    }

    void putVariant(String key, Object o) {
        putVariant(mSource, key, o);
    }

    @Override
    public boolean has(Object key) {
        return mSource.hasKey(resolveKey(key));
    }

    @Override
    public <T> T value(Object key, Class<T> type) {
        Object value = value(key);
        if (type.isInstance(value)) {
            return (T) value;
        }
        throw new IllegalArgumentException(
                String.format(
                        "%s: %s is of incompatible type %s, requested type was %s",
                        getClass().getSimpleName(),
                        key,
                        value.getClass(),
                        type
                )
        );
    }

    @Nullable
    @Override
    public Object value(Object key) {
        String name = resolveKey(key);
        return has(name) ? new ReanimatedDynamic(mSource.getDynamic(name)).value() : null;
    }

    private static void putVariant(WritableMap map, String key, Object o){
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
    }

    private static void putDynamic(WritableMap map, String key, Dynamic o){
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
    }

    static void addAll(WritableMap to, ReadableArray from) {
        Dynamic dynamic;
        for (int i = 0; i < from.size(); i++) {
            dynamic =  from.getDynamic(i);
            putDynamic(to, String.valueOf(i), dynamic);
            dynamic.recycle();
        }
    }
}
