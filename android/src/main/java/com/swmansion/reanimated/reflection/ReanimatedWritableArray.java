package com.swmansion.reanimated.reflection;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Dynamic;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableNativeArray;
import com.facebook.react.bridge.ReadableNativeMap;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeArray;

import static com.swmansion.reanimated.reflection.ReflectionUtils.isInteger;
import static com.swmansion.reanimated.reflection.ReflectionUtils.toDouble;

public class ReanimatedWritableArray extends WritableNativeArray implements ReadableObject {

    public static ReanimatedWritableArray fromArray(Object[] array){
        ReanimatedWritableArray out = new ReanimatedWritableArray();
        for (int i = 0; i < array.length; i++) {
            out.pushDynamic(array[i]);
        }
        return out;
    }

    public static ReanimatedWritableArray fromArray(ReadableArray array) {
        if (array instanceof ReanimatedWritableArray) {
            return ((ReanimatedWritableArray) array);
        } else {
            ReanimatedWritableArray out = new ReanimatedWritableArray();
            for (Object value: array.toArrayList()) {
                out.pushDynamic(value);
            }
            return out;
        }
    }

    private int resolveIndex(int index) {
        return index < 0 ? size() + index : index;
    }

    private Boolean indexInBounds(int index) {
        return index >= 0 && index < size();
    }

    @Override
    public Boolean has(String name) {
        int index = resolveIndex(Integer.valueOf(name));
        return indexInBounds(index);
    }

    public Object value(int index) {
        index = resolveIndex(index);
        return  indexInBounds(index) ? new ReanimatedDynamic(getDynamic(index)).value() : null;
    }

    @Nullable
    @Override
    public Object value(String name) {
        return ReflectionUtils.isInteger(name) ?
                value(Integer.valueOf(name)):
                null;
    }

    @Override
    public <T> T value(String name, Class<T> type) {
        Object value = value(name);
        if (type.isInstance(value)) {
            return (T) value;
        }
        throw new IllegalArgumentException(
                String.format(
                        "%s: %s is of incompatible type %s, requested type was %s",
                        getClass().getSimpleName(),
                        name,
                        value.getClass(),
                        type
                )
        );
    }

    @Nullable
    @Override
    public ReadableNativeArray getArray(int index) {
        index = resolveIndex(index);
        return fromArray(super.getArray(index));
    }

    @Override
    public boolean getBoolean(int index) {
        index = resolveIndex(index);
        return super.getType(index) == ReadableType.Boolean ?
                super.getBoolean(index) :
                super.getDouble(index) == 1;
    }

    @Override
    public double getDouble(int index) {
        index = resolveIndex(index);
        return super.getType(index) == ReadableType.Boolean ?
                toDouble(super.getBoolean(index)) :
                super.getDouble(index);
    }

    @NonNull
    @Override
    public Dynamic getDynamic(int index) {
        index = resolveIndex(index);
        return super.getDynamic(index);
    }

    public void pushDynamic(Object o) {
        pushVariant(this, o);
    }

    @Override
    public int getInt(int index) {
        index = resolveIndex(index);
        return super.getInt(index);
    }

    @Nullable
    @Override
    public ReadableNativeMap getMap(int index) {
        index = resolveIndex(index);
        return ReanimatedWritableMap.fromMap(super.getMap(index));
    }

    @Nullable
    @Override
    public String getString(int index) {
        index = resolveIndex(index);
        return super.getString(index);
    }

    @NonNull
    @Override
    public ReadableType getType(int index) {
        index = resolveIndex(index);
        return super.getType(index);
    }

    public ReanimatedWritableArray copy() {
        ReanimatedWritableArray copy = new ReanimatedWritableArray();
        addAll(copy, this);
        return copy;
    }

    @SuppressWarnings("UnusedReturnValue")
    protected static WritableArray pushVariant(WritableArray arr, Object o) {
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
    private static ReadableArray addAll(WritableArray to, ReadableArray from) {
        Dynamic dynamic;
        for (int i = 0; i < from.size(); i++) {
            dynamic =  from.getDynamic(i);
            pushDynamic(to, dynamic);
            dynamic.recycle();
        }

        return to;
    }

}
