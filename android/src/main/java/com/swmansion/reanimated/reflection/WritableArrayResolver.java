package com.swmansion.reanimated.reflection;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.Dynamic;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import static com.swmansion.reanimated.reflection.ReflectionUtils.isInteger;
import static com.swmansion.reanimated.reflection.ReflectionUtils.isString;
import static com.swmansion.reanimated.reflection.ReflectionUtils.toDouble;

public class WritableArrayResolver implements ReadableCollection {

    private WritableArray mSource;

    WritableArrayResolver(WritableArray array) {
        mSource = array;
    }

    private int size() {
        return mSource.size();
    }

    int resolveIndex(Object key) {
        return resolveIndex(key instanceof String ? Integer.valueOf((String) key) : ((int) key));
    }

    int resolveIndex(int index) {
        return index < 0 ? size() + index : index;
    }

    boolean indexInBounds(int index) {
        return index >= 0 && index < size();
    }

    void pushVariant(Object o) {
        pushVariant(mSource, o);
    }

    public Object value(int index) {
        index = resolveIndex(index);
        return indexInBounds(index) ? new ReanimatedDynamic(mSource.getDynamic(index)).value() : null;
    }

    @Override
    public boolean has(Object key) {
        int index = resolveIndex(key);
        return indexInBounds(index);
    }

    @Nullable
    @Override
    public Object value(Object key) {
        return isIndex(key) ?
                value(resolveIndex(key)):
                null;
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

    static boolean isIndex(Object key) {
        return isInteger(key) || (isString(key) && ((String) key).matches("-?\\d"));
    }

    private static void pushVariant(WritableArray arr, Object o) {
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
    }

    private static void pushDynamic(WritableArray arr, Dynamic o){
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
    }

    static void addAll(WritableArray to, ReadableArray from) {
        Dynamic dynamic;
        for (int i = 0; i < from.size(); i++) {
            dynamic =  from.getDynamic(i);
            pushDynamic(to, dynamic);
            dynamic.recycle();
        }
    }
}
