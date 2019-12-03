package com.swmansion.reanimated.reflection;

import com.facebook.react.bridge.WritableMap;

public interface ReanimatedMap extends ReadableCollection, WritableMap {
    void putDynamic(String name, Object value);
}
