package com.swmansion.reanimated.transitions;

import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.common.MapBuilder;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.views.view.ReactViewGroup;
import com.facebook.react.views.view.ReactViewManager;

import java.util.Map;

public class TransitionViewManager extends ReactViewManager {
    private static final String NAME = "ReanimatedTransitionManager";

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
    public ReactViewGroup createViewInstance(@NonNull ThemedReactContext reactContext) {
        return new ReactViewGroup(reactContext);
    }

    @Nullable
    @Override
    public Map<String, Object> getExportedCustomDirectEventTypeConstants() {
        return MapBuilder.<String, Object>of(TransitionEvent.EVENT_NAME, MapBuilder.of("registrationName", TransitionEvent.EVENT_NAME));
    }

}