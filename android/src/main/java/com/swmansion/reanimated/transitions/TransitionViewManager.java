package com.swmansion.reanimated.transitions;

import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.common.MapBuilder;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.ViewGroupManager;
import com.facebook.react.views.view.ReactViewGroup;

import java.util.Map;

public class TransitionViewManager extends ViewGroupManager<ViewGroup> {
    public static final String NAME = "ReanimatedTransitionManager";

    public TransitionViewManager() {
        super();
    }

    @NonNull
    @Override
    public String getName() {
        return NAME;
    }

    @NonNull
    @Override
    protected ViewGroup createViewInstance(@NonNull ThemedReactContext reactContext) {
        return new ReactViewGroup(reactContext);
    }

    @Nullable
    @Override
    public Map getExportedCustomDirectEventTypeConstants() {
        return MapBuilder.of(TransitionEvent.EVENT_NAME, MapBuilder.of("registrationName", TransitionEvent.EVENT_NAME));
    }
}
