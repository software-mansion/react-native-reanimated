package com.swmansion.reanimated.reflection;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Dynamic;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import java.util.ArrayList;

public class ReanimatedNativeCollection extends ReanimatedNativeMap implements WritableArray, WritableCollection {

    public static ReanimatedNativeCollection fromMap(ReadableMap source) {
        if (source instanceof ReanimatedNativeCollection) {
            return ((ReanimatedNativeCollection) source);
        } else {
            ReanimatedNativeCollection out = new ReanimatedNativeCollection();
            out.merge(source);
            return out;
        }
    }
    
    private final WritableCollectionResolver mResolver;

    @SuppressWarnings("WeakerAccess")
    public ReanimatedNativeCollection() {
        super();
        mResolver = new WritableCollectionResolver(this);
    }

    @Override
    public WritableMapResolver resolver() {
        return resolver;
    }

    @Override
    public void putValue(String key, Object value) {
        resolver.putVariant(key, value);
    }

    @Override
    public ReadableType getType() {
        return mResolver.getType();
    }

    @Override
    public ReanimatedNativeCollection copy() {
        ReanimatedNativeCollection copy = new ReanimatedNativeCollection();
        copy.merge(this);
        return copy;
    }

    @Nullable
    @Override
    public ReadableArray getArray(@NonNull String name) {
        return super.getArray(mResolver.resolveKey(name));
    }

    @Nullable
    @Override
    public ReadableArray getArray(int index) {
        return getArray(mResolver.resolveKey(index));
    }

    @Override
    public void pushArray(@Nullable ReadableArray array) {
        putArray(mResolver.nextIndex(), array);
    }

    @Override
    public boolean getBoolean(@NonNull String name) {
        return super.getBoolean(mResolver.resolveKey(name));
    }

    @Override
    public boolean getBoolean(int index) {
        return getBoolean(mResolver.resolveKey(index));
    }

    @Override
    public void pushBoolean(boolean value) {
        putBoolean(mResolver.nextIndex(), value);
    }

    @Override
    public double getDouble(@NonNull String name) {
        return super.getDouble(mResolver.resolveKey(name));
    }

    @Override
    public double getDouble(int index) {
        return getDouble(mResolver.resolveKey(index));
    }

    @Override
    public void pushDouble(double value) {
        putDouble(mResolver.nextIndex(), value);
    }

    @NonNull
    @Override
    public Dynamic getDynamic(@NonNull String name) {
        return super.getDynamic(mResolver.resolveKey(name));
    }

    @NonNull
    @Override
    public Dynamic getDynamic(int index) {
        return getDynamic(mResolver.resolveKey(index));
    }

    public void pushDynamic(Dynamic value) {
        putDynamic(mResolver.nextIndex(), value);
    }

    @Override
    public int getInt(@NonNull String name) {
        return super.getInt(mResolver.resolveKey(name));
    }

    @Override
    public int getInt(int index) {
        return getInt(mResolver.resolveKey(index));
    }

    @Override
    public void pushInt(int value) {
        putInt(mResolver.nextIndex(), value);
    }

    @Nullable
    @Override
    public ReanimatedNativeMap getMap(@NonNull String name) {
        return super.getMap(mResolver.resolveKey(name));
    }

    @Nullable
    @Override
    public ReadableMap getMap(int index) {
        return getMap(mResolver.resolveKey(index));
    }

    @Override
    public void pushMap(@Nullable ReadableMap map) {
        putMap(mResolver.nextIndex(), map);
    }

    @Nullable
    @Override
    public String getString(@NonNull String name) {
        return super.getString(mResolver.resolveKey(name));
    }

    @Nullable
    @Override
    public String getString(int index) {
        return getString(mResolver.resolveKey(index));
    }

    @Override
    public void pushString(@Nullable String value) {
        putString(mResolver.nextIndex(), value);
    }

    @NonNull
    @Override
    public ReadableType getType(@NonNull String name) {
        return super.getType(mResolver.resolveKey(name));
    }

    @NonNull
    @Override
    public ReadableType getType(int index) {
        return getType(mResolver.resolveKey(index));
    }

    @Override
    public boolean isNull(int index) {
        return isNull(mResolver.resolveKey(index));
    }

    @Override
    public void pushNull() {
        putNull(mResolver.nextIndex());
    }

    @Override
    public int size() {
        return mResolver.size();
    }

    @NonNull
    @Override
    public ArrayList<Object> toArrayList() {
        ArrayList<Object> list = new ArrayList<>();
        ReadableMapKeySetIterator keySetIterator = keySetIterator();
        String key;
        int index;

        while (keySetIterator.hasNextKey()) {
            key = keySetIterator.nextKey();
            if (WritableArrayResolver.isIndex(key)) {
                index = Integer.valueOf(key);
                list.ensureCapacity(index + 1);
                while (list.size() <= index) {
                    list.add(null);
                }
                list.set(index, new ReanimatedDynamic(getDynamic(key)).value());
            }
        }

        return list;
    }

    @Override
    public WritableArray asArray() {
        return this;
    }

    @Override
    public WritableArray asArray(int size) {
        return this;
    }

    @Override
    public WritableMap asMap() {
        return this;
    }

    @Override
    public Object export() {
        return this;
    }

    @NonNull
    @Override
    public String toString() {
        return mResolver.isArray() ? toArrayList().toString() : super.toString();
    }
}
