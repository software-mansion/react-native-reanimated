package com.swmansion.reanimated;

import android.graphics.drawable.Drawable;
import android.view.View;
import com.facebook.react.views.view.ReactViewBackgroundDrawable;

public class BorderRadiiDrawableUtils {
  public static ReactNativeUtils.BorderRadii getBorderRadii(View view) {
    Drawable background = view.getBackground();
    if (background instanceof ReactViewBackgroundDrawable) {
      ReactViewBackgroundDrawable drawable = (ReactViewBackgroundDrawable) background;
      return new ReactNativeUtils.BorderRadii(
          drawable.getFullBorderRadius(),
          drawable.getBorderRadius(ReactViewBackgroundDrawable.BorderRadiusLocation.TOP_LEFT),
          drawable.getBorderRadius(ReactViewBackgroundDrawable.BorderRadiusLocation.TOP_RIGHT),
          drawable.getBorderRadius(ReactViewBackgroundDrawable.BorderRadiusLocation.BOTTOM_LEFT),
          drawable.getBorderRadius(ReactViewBackgroundDrawable.BorderRadiusLocation.BOTTOM_RIGHT));
    } else {
      return new ReactNativeUtils.BorderRadii(0, 0, 0, 0, 0);
    }
  }
}
