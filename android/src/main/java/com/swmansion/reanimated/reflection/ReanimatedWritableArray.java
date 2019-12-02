package com.swmansion.reanimated.reflection;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Dynamic;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableNativeArray;
import com.facebook.react.bridge.ReadableNativeMap;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableNativeArray;

import static com.swmansion.reanimated.reflection.ReflectionUtils.toDouble;

public class ReanimatedWritableArray extends WritableNativeArray implements ReadableCollection {

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
        return WritableArrayUtils.resolveIndex(index, size());
    }

    private int resolveIndex(Object key) {
        return WritableArrayUtils.resolveIndex(key, size());
    }

    private boolean indexInBounds(int index) {
        return WritableArrayUtils.indexInBounds(index, size());
    }

    @Override
    public Boolean has(Object key) {
        int index = resolveIndex(key);
        return indexInBounds(index);
    }

    public Object value(int index) {
        index = resolveIndex(index);
        return  indexInBounds(index) ? new ReanimatedDynamic(getDynamic(index)).value() : null;
    }

    @Nullable
    @Override
    public Object value(Object key) {
        return WritableArrayUtils.isIndex(key) ?
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
        WritableArrayUtils.pushVariant(this, o);
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
        WritableArrayUtils.addAll(copy, this);
        return copy;
    }


}
