package com.swmansion.reanimated.reflection;

import androidx.annotation.Nullable;

public interface ReadableObject {
    Boolean has(String name);
    @Nullable Object value(String name);
    <T extends Object> T value(String name, Class<T> type);
}
