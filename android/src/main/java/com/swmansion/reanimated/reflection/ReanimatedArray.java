package com.swmansion.reanimated.reflection;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Dynamic;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableArray;

import java.util.ArrayList;


public class ReanimatedArray extends ArrayList<Object> implements WritableArray, ReadableCollection {
    
    static ReanimatedArray fromArray(ReadableArray source) {
        ReanimatedArray array = new ReanimatedArray();
        array.addAll(source.toArrayList());
        return array;
    }

    final WritableArrayResolver resolver;

    ReanimatedArray() {
        super();
        resolver = new WritableArrayResolver(this);
    }

    @Override
    public boolean has(Object key) {
        return resolver.has(key);
    }

    @Nullable
    @Override
    public Object value(Object key) {
        return resolver.value(key);
    }

    @Override
    public <T> T value(Object key, Class<T> type) {
        return resolver.value(key, type);
    }

    @Nullable
    @Override
    public ReanimatedArray getArray(int index) {
        index = resolver.resolveIndex(index);
        return fromArray((ReadableArray) super.get(index));
    }

    @Override
    public void pushArray(@Nullable ReadableArray array) {
        add(array);
    }

    @Override
    public boolean getBoolean(int index) {
        index = resolver.resolveIndex(index);
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
        index = resolver.resolveIndex(index);
        return ReflectionUtils.toDouble(super.get(index));
    }

    @Override
    public void pushDouble(double value) {
        add(value);
    }

    @NonNull
    @Override
    public Dynamic getDynamic(int index) {
        index = resolver.resolveIndex(index);
        return new ReanimatedDynamic(resolver, index);
    }

    public void pushDynamic(Object o) {
        resolver.pushVariant(o);
    }

    @Override
    public int getInt(int index) {
        index = resolver.resolveIndex(index);
        return ReflectionUtils.fromDouble(getDouble(index), int.class);
    }

    @Override
    public void pushInt(int value) {
        add(value);
    }

    @Nullable
    @Override
    public ReanimatedMap getMap(int index) {
        index = resolver.resolveIndex(index);
        return ReanimatedMap.fromMap((ReadableMap) super.get(index));
    }

    @Override
    public void pushMap(@Nullable ReadableMap map) {
        add(map);
    }

    @Nullable
    @Override
    public String getString(int index) {
        index = resolver.resolveIndex(index);
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
        index = resolver.resolveIndex(index);
        return ReflectionUtils.inferType(super.get(index));
    }

    public ReanimatedArray copy() {
        return ((ReanimatedArray) clone());
    }

    @NonNull
    @Override
    public ArrayList<Object> toArrayList() {
        return copy();
    }
}
