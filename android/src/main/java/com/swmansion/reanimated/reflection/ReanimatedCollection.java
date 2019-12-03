package com.swmansion.reanimated.reflection;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

public class ReanimatedCollection implements WritableCollection {

    private final WritableCollectionResolver mResolver;
    private ReanimatedMap map;

    public ReanimatedCollection() {
        super();
        mResolver = new WritableCollectionResolver(this);
        map = new ReanimatedMap();
    }

    @Override
    public ReadableCollection resolver() {
        return map.resolver;
    }

    @NonNull
    @Override
    public ReanimatedMap getMap() {
        return map;
    }

    @Override
    public void putDynamic(String key, Object value) {
        map.put(mResolver.resolveKey(key), value);
    }

    @Override
    public ReadableType getType() {
        return mResolver.getType();
    }

    @Override
    public void merge(WritableCollection source) {
        merge(source.getMap());
    }

    @Override
    public void merge(ReadableMap source) {
        map.merge(source);
        mResolver.size();
    }

    public ReanimatedCollection copy() {
        ReanimatedCollection copy = new ReanimatedCollection();
        copy.merge(this);
        return copy;
    }

    @Override
    public WritableMap asMap() {
        return map;
    }

    @Override
    public WritableArray asArray() {
        ReanimatedArray array = new ReanimatedArray();
        for (Object value: mResolver.toArrayList()) {
            array.pushDynamic(value);
        }
        return array;
    }

    @Override
    public Object export() {
        return mResolver.isArray() ? asArray() : asMap();
    }

    @NonNull
    @Override
    public String toString() {
        return export().toString();
    }
}
