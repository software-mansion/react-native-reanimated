package com.swmansion.reanimated.reflection;

import android.util.Log;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.Dynamic;
import com.facebook.react.bridge.JSApplicationCausedNativeException;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import static com.swmansion.reanimated.reflection.ReflectionUtils.isInteger;
import static com.swmansion.reanimated.reflection.ReflectionUtils.isString;
import static com.swmansion.reanimated.reflection.ReflectionUtils.toDouble;

public class ReadableArrayResolver extends ReadableCollectionResolver {

    interface Resolvable {
        int size();
        Object resolve(int index);
    }

    public static ReadableArrayResolver obtain(final ReadableArray source) {
        if (source instanceof ReanimatedBridge.ReanimatedArray) {
            return ((ReanimatedBridge.ReanimatedArray) source).resolver();
        } else {
            return new ReadableArrayResolver(new Resolvable() {
                @Override
                public int size() {
                    return source.size();
                }

                @Override
                public Object resolve(int index) {
                    return new ReanimatedDynamic(source.getDynamic(index)).value();
                }
            });
        }
    }

    private Resolvable mSource;

    ReadableArrayResolver(Resolvable array) {
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

    public Object value(int index) {
        index = resolveIndex(index);
        return indexInBounds(index) ? mSource.resolve(index) : null;
    }

    @Override
    public Object source() {
        return mSource;
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

    static boolean isIndex(Object key) {
        return isInteger(key) || (isString(key) && ((String) key).matches("-?\\d"));
    }

    static void pushVariant(WritableArray arr, Object o) {
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
