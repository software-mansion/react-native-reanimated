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

public class ReanimatedNativeArray extends WritableNativeArray implements ReadableCollection {

    public static ReanimatedNativeArray fromArray(Object[] array){
        ReanimatedNativeArray out = new ReanimatedNativeArray();
        for (int i = 0; i < array.length; i++) {
            out.pushDynamic(array[i]);
        }
        return out;
    }

    public static ReanimatedNativeArray fromArray(ReadableArray array) {
        if (array instanceof ReanimatedNativeArray) {
            return ((ReanimatedNativeArray) array);
        } else {
            ReanimatedNativeArray out = new ReanimatedNativeArray();
            for (Object value: array.toArrayList()) {
                out.pushDynamic(value);
            }
            return out;
        }
    }

    protected final WritableArrayResolver resolver;

    public ReanimatedNativeArray() {
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
    public ReadableNativeArray getArray(int index) {
        index = resolver.resolveIndex(index);
        return fromArray(super.getArray(index));
    }

    @Override
    public boolean getBoolean(int index) {
        index = resolver.resolveIndex(index);
        return super.getType(index) == ReadableType.Boolean ?
                super.getBoolean(index) :
                super.getDouble(index) == 1;
    }

    @Override
    public double getDouble(int index) {
        index = resolver.resolveIndex(index);
        return super.getType(index) == ReadableType.Boolean ?
                toDouble(super.getBoolean(index)) :
                super.getDouble(index);
    }

    @NonNull
    @Override
    public Dynamic getDynamic(int index) {
        index = resolver.resolveIndex(index);
        return super.getDynamic(index);
    }

    public void pushDynamic(Object o) {
        resolver.pushVariant(o);
    }

    @Override
    public int getInt(int index) {
        index = resolver.resolveIndex(index);
        return super.getInt(index);
    }

    @Nullable
    @Override
    public ReadableNativeMap getMap(int index) {
        index = resolver.resolveIndex(index);
        return ReanimatedNativeMap.fromMap(super.getMap(index));
    }

    @Nullable
    @Override
    public String getString(int index) {
        index = resolver.resolveIndex(index);
        return super.getString(index);
    }

    @NonNull
    @Override
    public ReadableType getType(int index) {
        index = resolver.resolveIndex(index);
        return super.getType(index);
    }

    public ReanimatedNativeArray copy() {
        ReanimatedNativeArray copy = new ReanimatedNativeArray();
        WritableArrayResolver.addAll(copy, this);
        return copy;
    }


}
