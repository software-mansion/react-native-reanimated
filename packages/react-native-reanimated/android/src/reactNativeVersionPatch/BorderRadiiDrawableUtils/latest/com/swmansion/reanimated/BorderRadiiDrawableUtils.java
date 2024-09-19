package com.swmansion.reanimated;

import android.graphics.Rect;
import android.view.View;
import com.facebook.react.uimanager.BackgroundStyleApplicator;
import com.facebook.react.uimanager.LengthPercentage;
import com.facebook.react.uimanager.style.BorderRadiusProp;

public class BorderRadiiDrawableUtils {
  public static ReactNativeUtils.BorderRadii getBorderRadii(View view) {
    Rect bounds = view.getBackground().getBounds();
    LengthPercentage full =
        BackgroundStyleApplicator.getBorderRadius(view, BorderRadiusProp.BORDER_RADIUS);
    LengthPercentage topLeft =
        BackgroundStyleApplicator.getBorderRadius(view, BorderRadiusProp.BORDER_TOP_LEFT_RADIUS);
    LengthPercentage topRight =
        BackgroundStyleApplicator.getBorderRadius(view, BorderRadiusProp.BORDER_TOP_RIGHT_RADIUS);
    LengthPercentage bottomLeft =
        BackgroundStyleApplicator.getBorderRadius(view, BorderRadiusProp.BORDER_BOTTOM_LEFT_RADIUS);
    LengthPercentage bottomRight =
        BackgroundStyleApplicator.getBorderRadius(
            view, BorderRadiusProp.BORDER_BOTTOM_RIGHT_RADIUS);

    // This logic is valid only when `LengthPercentage.getType()` equals
    // `LengthPercentageType.POINT`. However, since the `SET` logic is only applicable on paper,
    // which only supports the `POINT` type, it's safe to assume that the type will always be
    // `POINT`.
    // https://github.com/facebook/react-native/blob/6d51c5cd8ef817fe30f01a10f2af682fc02a5fb7/packages/react-native/ReactAndroid/src/main/java/com/facebook/react/views/view/ReactViewManager.java#L164
    return new ReactNativeUtils.BorderRadii(
        full == null
            ? 0
            : full.resolve(bounds.width(), bounds.height()).toPixelFromDIP().getHorizontal(),
        topLeft == null
            ? Float.NaN
            : topLeft.resolve(bounds.width(), bounds.height()).toPixelFromDIP().getHorizontal(),
        topRight == null
            ? Float.NaN
            : topRight.resolve(bounds.width(), bounds.height()).toPixelFromDIP().getHorizontal(),
        bottomLeft == null
            ? Float.NaN
            : bottomLeft.resolve(bounds.width(), bounds.height()).toPixelFromDIP().getHorizontal(),
        bottomRight == null
            ? Float.NaN
            : bottomRight
                .resolve(bounds.width(), bounds.height())
                .toPixelFromDIP()
                .getHorizontal());
  }
}
