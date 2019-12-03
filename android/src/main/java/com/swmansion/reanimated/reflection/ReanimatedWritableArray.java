package com.swmansion.reanimated.reflection;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Dynamic;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableArray;

import java.util.ArrayList;


public class ReanimatedWritableArray extends ArrayList<Object> implements ReanimatedArray {
    
    static ReanimatedWritableArray fromArray(ReadableArray source) {
        ReanimatedWritableArray array = new ReanimatedWritableArray();
        array.addAll(source.toArrayList());
        return array;
    }

    final WritableArrayResolver resolver;

    ReanimatedWritableArray() {
        super();
        resolver = new WritableArrayResolver(this);
    }

    @Override
    public Object value(int index) {
        return new ReanimatedDynamic(getDynamic(index)).value();
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
    public ReanimatedWritableArray getArray(int index) {
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

    @Override
    public void pushDynamic(Object o) {
        WritableArrayResolver.pushVariant(this, o);
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
    public ReanimatedWritableMap getMap(int index) {
        index = resolver.resolveIndex(index);
        return ReanimatedWritableMap.fromMap((ReadableMap) super.get(index));
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

    public ReanimatedWritableArray copy() {
        return ((ReanimatedWritableArray) clone());
    }

    @NonNull
    @Override
    public ArrayList<Object> toArrayList() {
        return copy();
    }
}
