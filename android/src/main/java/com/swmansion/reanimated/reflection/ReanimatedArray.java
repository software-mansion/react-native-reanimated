package com.swmansion.reanimated.reflection;

import com.facebook.react.bridge.WritableArray;

public interface ReanimatedArray extends WritableArray, ReadableCollection,WritableArrayResolver.Resolvable {
    void pushDynamic(Object value);
}
