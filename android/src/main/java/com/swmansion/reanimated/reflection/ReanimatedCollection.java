package com.swmansion.reanimated.reflection;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

public class ReanimatedCollection extends ReanimatedMap implements WritableCollection {

    private final WritableCollectionResolver mResolver;

    @SuppressWarnings("WeakerAccess")
    public ReanimatedCollection() {
        super();
        mResolver = new WritableCollectionResolver(this);
    }

    @Override
    public void putMap(@NonNull String key, @Nullable ReadableMap value) {
        super.putMap(mResolver.resolveKey(key), value);
    }

    @Override
    public void putValue(String key, Object value) {
        resolver.putVariant(key, value);
    }

    @Override
    public WritableMapResolver resolver() {
        return resolver;
    }

    @Override
    public ReadableType getType() {
        return mResolver.getType();
    }

    @Override
    public ReanimatedCollection copy() {
        return ((ReanimatedCollection) clone());
    }

    @Override
    public WritableMap asMap() {
        return this;
    }

    @Override
    public WritableArray asArray() {
        return null;
    }

    @Override
    public WritableArray asArray(int size) {
        return null;
    }

    @Override
    public Object export() {
        return getType() == ReadableType.Array ? asArray() : asMap();
    }
}
