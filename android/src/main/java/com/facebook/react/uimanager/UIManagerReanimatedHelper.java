package com.facebook.react.uimanager;

import com.facebook.react.bridge.CatalystInstance;
import com.facebook.react.bridge.UIManager;

import java.lang.reflect.Field;
import java.util.Map;

/**
 * This class provides a way to workaround limited visibility of UIViewOperationQueue#getUIViewOperationQueue.
 * We rely on accessing that method to check if operation queue is empty or not. This in turn indicates if
 * we are in a middle of processing batch of operations from JS. In such a case we can rely on the enqueued update
 * operations to be flushed onto the shadow view hierarchy. Otherwise we want to trigger "dispatchViewUpdates" and
 * enforce flush immediately.
 */
public class UIManagerReanimatedHelper {
  public static boolean isOperationQueueEmpty(UIImplementation uiImplementation) {
    return uiImplementation.getUIViewOperationQueue().isEmpty();
  }

  public static ViewManager resolveViewManager(UIImplementation uiImplementation, String className) {
    return uiImplementation.resolveViewManager(className);
  }

  public static ViewManagerRegistry getViewManagerRegistry(UIImplementation uiImplementation) throws NoSuchFieldException, IllegalAccessException {
    Field f = uiImplementation.getClass().getDeclaredField("mViewManagers");
    f.setAccessible(true);
    return ((ViewManagerRegistry) f.get(uiImplementation));
  }

  public static Map<String, ViewManager> getViewManagers(UIImplementation uiImplementation) throws NoSuchFieldException, IllegalAccessException {
    return getViewManagers(getViewManagerRegistry(uiImplementation));
  }

  public static Map<String, ViewManager> getViewManagers(ViewManagerRegistry viewManagerRegistry) throws NoSuchFieldException, IllegalAccessException {
    Field f = viewManagerRegistry.getClass().getDeclaredField("mViewManagers");
    f.setAccessible(true);
    return ((Map<String, ViewManager>) f.get(viewManagerRegistry));
  }
}
