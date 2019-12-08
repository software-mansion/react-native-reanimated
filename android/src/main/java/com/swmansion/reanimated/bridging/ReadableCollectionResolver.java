package com.swmansion.reanimated.bridging;

import com.facebook.react.bridge.JSApplicationCausedNativeException;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;

abstract class ReadableCollectionResolver implements ReanimatedBridge.ReadableCollection {

    @SuppressWarnings("unchecked cast")
    @Override
    public <T> T value(Object key, Class<T> type) {
        Object value = value(key);
        if (type.isInstance(value)) {
            return (T) value;
        } else if (type.isInstance(ReanimatedBridge.ReadableCollection.class) || type.equals(ReanimatedBridge.ReadableCollection.class)) {
            if (value instanceof ReadableArray) {
                return (T) ReadableArrayResolver.obtain((ReadableArray) value);
            } else if (value instanceof ReadableMap) {
                return (T) ReadableMapResolver.obtain((ReadableMap) value);
            }
        }

        throw new JSApplicationCausedNativeException(
                String.format(
                        "%s: %s is of incompatible type %s, requested type was %s",
                        getClass().getSimpleName(),
                        key,
                        value.getClass(),
                        type
                )
        );
    }
}
