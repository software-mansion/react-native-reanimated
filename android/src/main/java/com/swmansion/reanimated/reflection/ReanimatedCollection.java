package com.swmansion.reanimated.reflection;

public class ReanimatedCollection extends MapBuilder {
    public ReanimatedCollection() throws IllegalAccessException, InstantiationException {
        super(ReanimatedMap.class, ReanimatedArray.class);
    }
}
