package com.swmansion.reanimated.reflection;

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
    public void putDynamic(String key, Object value) {
        put(mResolver.resolveKey(key), value);
    }

    @Override
    public ReadableType getType() {
        return mResolver.getType();
    }

    public ReanimatedCollection copy() {
        return ((ReanimatedCollection) clone());
    }

    @Override
    public WritableMap asMap() {
        return null;
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
