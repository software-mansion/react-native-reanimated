package com.swmansion.reanimated.reflection;

import androidx.annotation.Nullable;

public interface ReadableCollection {
    boolean has(Object key);
    @Nullable Object value(Object key);
    <T extends Object> T value(Object key, Class<T> type);
}
