package com.swmansion.reanimated;

import android.graphics.drawable.Drawable;
import android.view.View;
import com.facebook.react.uimanager.LengthPercentage;
import com.facebook.react.uimanager.drawable.CSSBackgroundDrawable;
import com.facebook.react.uimanager.style.ComputedBorderRadius;

public class BorderRadiiDrawableUtils {
  public static ReactNativeUtils.BorderRadii getBorderRadii(View view) {
    Drawable background = view.getBackground();
    if (background instanceof CSSBackgroundDrawable) {
      CSSBackgroundDrawable drawable = (CSSBackgroundDrawable) background;
      LengthPercentage uniform = drawable.getBorderRadius().getUniform();
      float full = uniform != null ? uniform.resolve(view.getWidth(), view.getHeight()) : Float.NaN;
      ComputedBorderRadius computedBorderRadius = drawable.getComputedBorderRadius();
      return new ReactNativeUtils.BorderRadii(
          full,
          computedBorderRadius.getTopLeft(),
          computedBorderRadius.getTopRight(),
          computedBorderRadius.getBottomLeft(),
          computedBorderRadius.getBottomRight());
    } else {
      return new ReactNativeUtils.BorderRadii(0, 0, 0, 0, 0);
    }
  }
}
