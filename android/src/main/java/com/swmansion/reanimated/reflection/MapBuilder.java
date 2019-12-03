package com.swmansion.reanimated.reflection;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

public interface MapBuilder {
    @NonNull WritableMap getMap();
    void putDynamic(String key, Object value);
    void merge(MapBuilder source);
    void merge(ReadableMap source);
    MapBuilder copy();
    ReadableCollection resolver();
    WritableArray asArray();
    WritableMap asMap();
    ReadableType getType();
    Object export();
}
