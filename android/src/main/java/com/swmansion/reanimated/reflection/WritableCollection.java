package com.swmansion.reanimated.reflection;

import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

public interface WritableCollection extends WritableMap {
    void putValue(String key, Object value);
    WritableMapResolver resolver();
    /**
     * builds an {@link java.util.ArrayList} mocking {@link WritableArray}
     * if size isn't provided and relative indexes exist (e.g. -1), indexes are resolved from current size of elements
     * pass `size` in order to resolve relative indexes properly
     */
    WritableArray asArray();
    WritableArray asArray(int size);
    WritableMap asMap();
    ReadableType getType();
    Object export();
}
