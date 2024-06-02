/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.react.views.swiperefresh;

import static com.facebook.react.views.swiperefresh.SwipeRefreshLayoutManager.REACT_CLASS;

import android.graphics.Color;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout.OnRefreshListener;
import com.facebook.react.bridge.ColorPropConverter;
import com.facebook.react.bridge.Dynamic;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.common.MapBuilder;
import com.facebook.react.module.annotations.ReactModule;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.UIManagerHelper;
import com.facebook.react.uimanager.ViewGroupManager;
import com.facebook.react.uimanager.ViewManagerDelegate;
import com.facebook.react.uimanager.ViewProps;
import com.facebook.react.uimanager.annotations.ReactProp;
import com.facebook.react.uimanager.events.EventDispatcher;
import com.facebook.react.viewmanagers.AndroidSwipeRefreshLayoutManagerDelegate;
import com.facebook.react.viewmanagers.AndroidSwipeRefreshLayoutManagerInterface;
import java.util.HashMap;
import java.util.Map;

/**
 * ViewManager for {@link ReactSwipeRefreshLayout} which allows the user to "pull to refresh" a
 * child view. Emits an {@code onRefresh} event when this happens.
 */
@ReactModule(name = REACT_CLASS)
public class SwipeRefreshLayoutManager extends ViewGroupManager<ReactSwipeRefreshLayout>
    implements AndroidSwipeRefreshLayoutManagerInterface<ReactSwipeRefreshLayout> {

  public static final String REACT_CLASS = "AndroidSwipeRefreshLayout";

  private final ViewManagerDelegate<ReactSwipeRefreshLayout> mDelegate;

  public SwipeRefreshLayoutManager() {
    mDelegate = new AndroidSwipeRefreshLayoutManagerDelegate<>(this);
  }

  @Override
  protected ReactSwipeRefreshLayout createViewInstance(ThemedReactContext reactContext) {
    return new ReactSwipeRefreshLayout(reactContext);
  }

  @Override
  public String getName() {
    return REACT_CLASS;
  }

  @Override
  @ReactProp(name = ViewProps.ENABLED, defaultBoolean = true)
  public void setEnabled(ReactSwipeRefreshLayout view, boolean enabled) {
    view.setEnabled(enabled);
  }

  @Override
  @ReactProp(name = "colors", customType = "ColorArray")
  public void setColors(ReactSwipeRefreshLayout view, @Nullable ReadableArray colors) {
    if (colors != null) {
      int[] colorValues = new int[colors.size()];
      for (int i = 0; i < colors.size(); i++) {
        if (colors.getType(i) == ReadableType.Map) {
          colorValues[i] = ColorPropConverter.getColor(colors.getMap(i), view.getContext());
        } else {
          colorValues[i] = colors.getInt(i);
        }
      }
      view.setColorSchemeColors(colorValues);
    } else {
      view.setColorSchemeColors();
    }
  }

  @Override
  @ReactProp(name = "progressBackgroundColor", customType = "Color")
  public void setProgressBackgroundColor(ReactSwipeRefreshLayout view, Integer color) {
    view.setProgressBackgroundColorSchemeColor(color == null ? Color.TRANSPARENT : color);
  }

  // TODO(T46143833): Remove this method once the 'size' prop has been migrated to String in JS.
  public void setSize(ReactSwipeRefreshLayout view, int value) {
    view.setSize(value);
  }

  @Override
  public void setSize(ReactSwipeRefreshLayout view, String size) {
    if (size == null || size.equals("default")) {
      view.setSize(SwipeRefreshLayout.DEFAULT);
    } else if (size.equals("large")) {
      view.setSize(SwipeRefreshLayout.LARGE);
    } else {
      throw new IllegalArgumentException("Size must be 'default' or 'large', received: " + size);
    }
  }

  // This prop temporarily takes both 0 and 1 as well as 'default' and 'large'.
  // 0 and 1 are deprecated and will be removed in a future release.
  // See T46143833
  @ReactProp(name = "size")
  public void setSize(ReactSwipeRefreshLayout view, Dynamic size) {
    if (size.isNull()) {
      view.setSize(SwipeRefreshLayout.DEFAULT);
    } else if (size.getType() == ReadableType.Number) {
      view.setSize(size.asInt());
    } else if (size.getType() == ReadableType.String) {
      setSize(view, size.asString());
    } else {
      throw new IllegalArgumentException("Size must be 'default' or 'large'");
    }
  }

  @Override
  @ReactProp(name = "refreshing")
  public void setRefreshing(ReactSwipeRefreshLayout view, boolean refreshing) {
    view.setRefreshing(refreshing);
  }

  @Override
  @ReactProp(name = "progressViewOffset", defaultFloat = 0)
  public void setProgressViewOffset(final ReactSwipeRefreshLayout view, final float offset) {
    view.setProgressViewOffset(offset);
  }

  @Override
  public void setNativeRefreshing(ReactSwipeRefreshLayout view, boolean value) {
    setRefreshing(view, value);
  }

  @Override
  protected void addEventEmitters(
      final ThemedReactContext reactContext, final ReactSwipeRefreshLayout view) {
    view.setOnRefreshListener(
        new OnRefreshListener() {
          @Override
          public void onRefresh() {
            EventDispatcher eventDispatcher =
                UIManagerHelper.getEventDispatcherForReactTag(reactContext, view.getId());
            if (eventDispatcher != null) {
              eventDispatcher.dispatchEvent(
                  new RefreshEvent(UIManagerHelper.getSurfaceId(view), view.getId()));
            }
          }
        });
  }

  @Override
  public void receiveCommand(
      @NonNull ReactSwipeRefreshLayout root, String commandId, @Nullable ReadableArray args) {
    switch (commandId) {
      case "setNativeRefreshing":
        if (args != null) {
          setRefreshing(root, args.getBoolean(0));
        }
        break;
    }
  }

  @Nullable
  @Override
  public Map<String, Object> getExportedViewConstants() {
    return MapBuilder.<String, Object>of(
        "SIZE",
        MapBuilder.of("DEFAULT", SwipeRefreshLayout.DEFAULT, "LARGE", SwipeRefreshLayout.LARGE));
  }

  @Override
  public Map<String, Object> getExportedCustomDirectEventTypeConstants() {
    @Nullable
    Map<String, Object> baseEventTypeConstants = super.getExportedCustomDirectEventTypeConstants();
    Map<String, Object> eventTypeConstants =
        baseEventTypeConstants == null ? new HashMap<String, Object>() : baseEventTypeConstants;
    eventTypeConstants.putAll(
        MapBuilder.<String, Object>builder()
            .put("topRefresh", MapBuilder.of("registrationName", "onRefresh"))
            .build());
    return eventTypeConstants;
  }

  @Override
  protected ViewManagerDelegate<ReactSwipeRefreshLayout> getDelegate() {
    return mDelegate;
  }
}
