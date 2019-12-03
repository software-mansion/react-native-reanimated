package com.swmansion.reanimated.reflection;

import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

public interface WritableCollection extends WritableMap {
    void putDynamic(String key, Object value);
    ReadableCollection resolver();
    WritableArray asArray();
    WritableMap asMap();
    ReadableType getType();
    Object export();
}
