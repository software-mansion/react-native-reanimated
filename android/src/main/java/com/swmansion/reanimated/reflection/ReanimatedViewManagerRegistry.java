package com.swmansion.reanimated.reflection;

import com.facebook.react.uimanager.UIImplementation;
import com.facebook.react.uimanager.ViewManager;
import com.facebook.react.uimanager.ViewManagerRegistry;

import java.lang.reflect.Field;
import java.util.Map;

class ReanimatedViewManagerRegistry {
    private static ViewManagerRegistry getViewManagerRegistry(UIImplementation uiImplementation) throws NoSuchFieldException, IllegalAccessException {
        Field f = uiImplementation.getClass().getDeclaredField("mViewManagers");
        f.setAccessible(true);
        return ((ViewManagerRegistry) f.get(uiImplementation));
    }

    static Map<String, ViewManager> getViewManagers(UIImplementation uiImplementation) throws NoSuchFieldException, IllegalAccessException {
        return getViewManagers(getViewManagerRegistry(uiImplementation));
    }

    private static Map<String, ViewManager> getViewManagers(ViewManagerRegistry viewManagerRegistry) throws NoSuchFieldException, IllegalAccessException {
        Field f = viewManagerRegistry.getClass().getDeclaredField("mViewManagers");
        f.setAccessible(true);
        //noinspection unchecked
        return ((Map<String, ViewManager>) f.get(viewManagerRegistry));
    }
}
