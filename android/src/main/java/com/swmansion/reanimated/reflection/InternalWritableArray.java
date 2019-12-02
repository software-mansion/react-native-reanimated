package com.swmansion.reanimated.reflection;

import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Dynamic;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableArray;

import java.util.ArrayList;


public class InternalWritableArray extends ArrayList<Object> implements WritableArray, WritableCollection {
    
    static InternalWritableArray fromArray(ReadableArray source) {
        InternalWritableArray array = new InternalWritableArray();
        array.addAll(source.toArrayList());
        return array;
    }

    private int resolveIndex(int index) {
        return WritableArrayUtils.resolveIndex(index, size());
    }

    private int resolveIndex(Object key) {
        return WritableArrayUtils.resolveIndex(key, size());
    }

    private Boolean indexInBounds(int index) {
        return WritableArrayUtils.indexInBounds(index, size());
    }

    @Override
    public Boolean has(Object key) {
        int index = resolveIndex(key);
        return indexInBounds(index);
    }

    public Object value(int index) {
        index = resolveIndex(index);
        return indexInBounds(index) ? new ReanimatedDynamic(getDynamic(index)).value() : null;
    }

    @Nullable
    @Override
    public Object value(Object key) {
        return WritableArrayUtils.isIndex(key) ?
                value(key):
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
    public InternalWritableArray getArray(int index) {
        index = resolveIndex(index);
        return fromArray((ReadableArray) super.get(index));
    }

    @Override
    public void pushArray(@Nullable ReadableArray array) {
        add(array);
    }

    @Override
    public boolean getBoolean(int index) {
        index = resolveIndex(index);
        Object value = get(index);
        if (ReflectionUtils.isNumber(value)) {
            value = ReflectionUtils.toDouble(value) == 1;
        }
        return ((boolean) value);
    }

    @Override
    public void pushBoolean(boolean value) {
        add(value);
    }

    @Override
    public double getDouble(int index) {
        index = resolveIndex(index);
        return ReflectionUtils.toDouble(super.get(index));
    }

    @Override
    public void pushDouble(double value) {
        add(value);
    }

    @NonNull
    @Override
    public Dynamic getDynamic(int index) {
        index = resolveIndex(index);
        return new ReanimatedDynamic(this, index);
    }

    public void pushDynamic(Object o) {
        WritableArrayUtils.pushVariant(this, o);
    }

    public void putDynamic(int index, Object value) {
        index = resolveIndex(index);
        ensureCapacity(index);
        while (index >= size()) {
            add(null);
            Log.d("Invoke", "putDynamic: " + index + "  " + size());
        }

        value = value instanceof Dynamic ? new ReanimatedDynamic((Dynamic) value).value() : value;
        super.set(index, value);
    }

    @Override
    public void putDynamic(String name, Object value) {
        int index = resolveIndex(name);
        putDynamic(index, value);
    }

    @Override
    public int getInt(int index) {
        index = resolveIndex(index);
        return ReflectionUtils.fromDouble(getDouble(index), int.class);
    }

    @Override
    public void pushInt(int value) {
        add(value);
    }

    @Nullable
    @Override
    public InternalWritableMap getMap(int index) {
        index = resolveIndex(index);
        return InternalWritableMap.fromMap((ReadableMap) super.get(index));
    }

    @Override
    public void pushMap(@Nullable ReadableMap map) {
        add(map);
    }

    @Nullable
    @Override
    public String getString(int index) {
        index = resolveIndex(index);
        return ((String) super.get(index));
    }

    @Override
    public void pushString(@Nullable String value) {
        add(value);
    }

    @Override
    public boolean isNull(int index) {
        return super.get(index) == null;
    }

    @Override
    public void pushNull() {
        add(null);
    }

    @NonNull
    @Override
    public ReadableType getType(int index) {
        index = resolveIndex(index);
        return ReflectionUtils.inferType(super.get(index));
    }

    @Override
    public InternalWritableArray copy() {
        return ((InternalWritableArray) clone());
        /*
        InternalWritableArray copy = new InternalWritableArray();
        copy.addAll(this);
        return copy;
        
         */
    }

    @Override
    public void merge(@NonNull ReadableCollection source) {
        InternalWritableArray array = fromArray((ReadableArray) source);
        for (int i = 0; i < array.size(); i++) {
            putDynamic(i, array.value(i));
        }
    }

    @NonNull
    @Override
    public ArrayList<Object> toArrayList() {
        return copy();
    }
}
