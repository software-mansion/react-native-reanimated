package com.swmansion.reanimated.reflection;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

public interface WritableCollection {
    @NonNull WritableMap getMap();
    void putDynamic(String key, Object value);
    void merge(WritableCollection source);
    void merge(ReadableMap source);
    WritableCollection copy();
    ReadableCollection resolver();
    WritableArray asArray();
    WritableMap asMap();
    ReadableType getType();
    Object export();
}
