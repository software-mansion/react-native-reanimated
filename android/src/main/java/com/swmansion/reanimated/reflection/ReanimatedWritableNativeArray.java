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

public class ReanimatedWritableNativeArray extends WritableNativeArray implements ReanimatedBridge.ReanimatedArray {

    public static ReanimatedWritableNativeArray fromArray(Object[] array){
        ReanimatedWritableNativeArray out = new ReanimatedWritableNativeArray();
        for (int i = 0; i < array.length; i++) {
            out.pushDynamic(ReflectionUtils.nativeCloneDeep(array[i]));
        }
        return out;
    }

    public static ReanimatedWritableNativeArray fromArray(ReadableArray array) {
        if (array instanceof ReanimatedWritableNativeArray) {
            return ((ReanimatedWritableNativeArray) array);
        } else {
            ReanimatedWritableNativeArray out = new ReanimatedWritableNativeArray();
            for (Object value: array.toArrayList()) {
                out.pushDynamic(ReflectionUtils.nativeCloneDeep(value));
            }
            return out;
        }
    }

    protected final WritableArrayResolver resolver;

    public ReanimatedWritableNativeArray() {
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

    @Override
    public void pushDynamic(Object o) {
        WritableArrayResolver.pushVariant(this, o);
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
        return ReanimatedWritableNativeMap.fromMap(super.getMap(index));
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

    public ReanimatedWritableNativeArray copy() {
        ReanimatedWritableNativeArray copy = new ReanimatedWritableNativeArray();
        WritableArrayResolver.addAll(copy, this);
        return copy;
    }


}
