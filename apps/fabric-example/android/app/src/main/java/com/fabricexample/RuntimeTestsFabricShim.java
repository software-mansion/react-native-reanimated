package com.fabricexample;

import android.content.Context;
import android.view.View;
import com.facebook.react.fabric.FabricUIManager;
import com.facebook.react.fabric.SurfaceHandlerBinding;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.Collection;

/**
 * Runtime tests only. A surface that starts with no root view, so that its mount items wait in the attach queue of
 * its mounting manager. `SurfaceHandlerBinding` and the mounting manager are internal to React Native: Java reaches
 * them, Kotlin of another module does not. UI thread only.
 */
final class RuntimeTestsFabricShim {
  private final FabricUIManager uiManager;
  private final SurfaceHandlerBinding surfaceHandler;

  private RuntimeTestsFabricShim(FabricUIManager uiManager, SurfaceHandlerBinding surfaceHandler) {
    this.uiManager = uiManager;
    this.surfaceHandler = surfaceHandler;
  }

  static RuntimeTestsFabricShim startWithoutRootView(
      FabricUIManager uiManager, Context context, String moduleName, int sizePx, float density) {
    SurfaceHandlerBinding surfaceHandler = new SurfaceHandlerBinding(moduleName);
    int measureSpec = View.MeasureSpec.makeMeasureSpec(sizePx, View.MeasureSpec.EXACTLY);
    surfaceHandler.setLayoutConstraints(measureSpec, measureSpec, 0, 0, false, false, density, 1f);
    uiManager.startSurface(surfaceHandler, context, null);
    surfaceHandler.setMountable(true);
    return new RuntimeTestsFabricShim(uiManager, surfaceHandler);
  }

  int surfaceId() {
    return surfaceHandler.getSurfaceId();
  }

  void attachRootView(View rootView) {
    uiManager.attachRootView(surfaceHandler, rootView);
  }

  void stop() {
    uiManager.stopSurface(surfaceHandler);
  }

  /** The pull mount items that wait for the root view of the surface. */
  int queuedPullItemCount() throws ReflectiveOperationException {
    int count = 0;
    for (Object item : queuedMountItems()) {
      if (item.getClass().getSimpleName().contains("PullTransaction")) {
        count++;
      }
    }
    return count;
  }

  private Collection<?> queuedMountItems() throws ReflectiveOperationException {
    Field mountingManagerField = FabricUIManager.class.getDeclaredField("mMountingManager");
    mountingManagerField.setAccessible(true);
    Object mountingManager = mountingManagerField.get(uiManager);
    Method getSurfaceManager = mountingManager.getClass().getMethod("getSurfaceManager", int.class);
    Object surfaceManager = getSurfaceManager.invoke(mountingManager, surfaceId());
    if (surfaceManager == null) {
      throw new IllegalStateException("The surface " + surfaceId() + " has no mounting manager.");
    }
    Field queueField = surfaceManager.getClass().getDeclaredField("onViewAttachMountItems");
    queueField.setAccessible(true);
    return (Collection<?>) queueField.get(surfaceManager);
  }
}
