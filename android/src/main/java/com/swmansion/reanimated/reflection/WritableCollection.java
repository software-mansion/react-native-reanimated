package com.swmansion.reanimated.reflection;

import androidx.annotation.NonNull;

public interface WritableCollection extends ReadableCollection {
    void putDynamic(String name, Object value);
    void merge(@NonNull ReadableCollection source);
    WritableCollection copy();
}
