package com.swmansion.reanimated.reflection;

public class ReanimatedNativeCollection extends MapBuilder {
    ReanimatedNativeCollection() throws IllegalAccessException, InstantiationException {
        super(ReanimatedNativeMap.class, ReanimatedNativeArray.class);
    }

/*
    @NonNull
    @Override
    public String toString() {
        return mResolver.isArray() ? mResolver.toArrayList().toString() : super.toString();
    }
*/



}
