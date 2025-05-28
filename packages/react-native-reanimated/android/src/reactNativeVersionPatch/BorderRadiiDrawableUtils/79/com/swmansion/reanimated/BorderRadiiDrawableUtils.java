package com.swmansion.reanimated;

import android.graphics.Rect;
import android.view.View;
import com.facebook.react.uimanager.BackgroundStyleApplicator;
import com.facebook.react.uimanager.LengthPercentage;
import com.facebook.react.uimanager.style.BorderRadiusProp;

public class BorderRadiiDrawableUtils {
  private static float getRadiusForCorner(View view, BorderRadiusProp corner, float defaultValue) {
    // This logic is valid only when `LengthPercentage.getType()` equals
    // `LengthPercentageType.POINT`. However, since the `SET` logic is only applicable on paper,
    // which only supports the `POINT` type, it's safe to assume that the type will always be
    // `POINT`.
    // https://github.com/facebook/react-native/blob/6d51c5cd8ef817fe30f01a10f2af682fc02a5fb7/packages/react-native/ReactAndroid/src/main/java/com/facebook/react/views/view/ReactViewManager.java#L164
    LengthPercentage length = BackgroundStyleApplicator.getBorderRadius(view, corner);
    if (length == null) {
      return defaultValue;
    }
    Rect bounds = view.getBackground().getBounds();
    return length.resolve(bounds.width(), bounds.height()).toPixelFromDIP().getHorizontal();
  }

  public static ReactNativeUtils.BorderRadii getBorderRadii(View view) {
    return new ReactNativeUtils.BorderRadii(
        getRadiusForCorner(view, BorderRadiusProp.BORDER_RADIUS, 0),
        getRadiusForCorner(view, BorderRadiusProp.BORDER_TOP_LEFT_RADIUS, Float.NaN),
        getRadiusForCorner(view, BorderRadiusProp.BORDER_TOP_RIGHT_RADIUS, Float.NaN),
        getRadiusForCorner(view, BorderRadiusProp.BORDER_BOTTOM_LEFT_RADIUS, Float.NaN),
        getRadiusForCorner(view, BorderRadiusProp.BORDER_BOTTOM_RIGHT_RADIUS, Float.NaN));
  }
}
