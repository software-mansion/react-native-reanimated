package com.swmansion.reanimated.reflection;

import com.facebook.react.bridge.WritableMap;

public interface ReanimatedMap extends WritableMap, ReadableCollection {
    void putDynamic(String name, Object value);
}
