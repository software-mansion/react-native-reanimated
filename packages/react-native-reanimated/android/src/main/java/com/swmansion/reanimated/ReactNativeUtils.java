package com.swmansion.reanimated;

import android.graphics.drawable.Drawable;
import android.view.View;

import com.facebook.react.uimanager.LengthPercentage;
import com.facebook.react.uimanager.drawable.CSSBackgroundDrawable;
import com.facebook.react.uimanager.style.BorderRadiusProp;
import com.facebook.react.uimanager.style.ComputedBorderRadius;
import com.facebook.react.views.image.ReactImageView;
import com.facebook.react.views.view.ReactViewBackgroundDrawable;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.Objects;

public class ReactNativeUtils {

  private static Field mBorderRadiusField;
  private static Method getCornerRadiiMethod;

  public static class BorderRadii {
    public float full, topLeft, topRight, bottomLeft, bottomRight;

    public BorderRadii(
        float full, float topLeft, float topRight, float bottomLeft, float bottomRight) {
      this.full = Float.isNaN(full) ? 0 : full;
      this.topLeft = Float.isNaN(topLeft) ? this.full : topLeft;
      this.topRight = Float.isNaN(topRight) ? this.full : topRight;
      this.bottomLeft = Float.isNaN(bottomLeft) ? this.full : bottomLeft;
      this.bottomRight = Float.isNaN(bottomRight) ? this.full : bottomRight;
    }
  }

  public static BorderRadii getBorderRadii(View view) {
    if (view.getBackground() != null) {
      Drawable background = view.getBackground();
      if (background instanceof CSSBackgroundDrawable drawable) {
        LengthPercentage uniform = drawable.getBorderRadius().getUniform();
        float full = uniform != null ? uniform.resolve(view.getWidth(), view.getHeight()) : Float.NaN;
        ComputedBorderRadius computedBorderRadius = drawable.getComputedBorderRadius();
        return new BorderRadii(
                full,
                computedBorderRadius.getTopLeft(),
                computedBorderRadius.getTopRight(),
                computedBorderRadius.getBottomLeft(),
                computedBorderRadius.getBottomRight());
      }
    } else if (view instanceof ReactImageView) {
      try {
        if (mBorderRadiusField == null) {
          mBorderRadiusField = ReactImageView.class.getDeclaredField("mBorderRadius");
          mBorderRadiusField.setAccessible(true);
        }
        float fullBorderRadius = mBorderRadiusField.getFloat(view);
        if (getCornerRadiiMethod == null) {
          getCornerRadiiMethod =
              ReactImageView.class.getDeclaredMethod("getCornerRadii", float[].class);
          getCornerRadiiMethod.setAccessible(true);
        }
        if (Float.isNaN(fullBorderRadius)) {
          fullBorderRadius = 0;
        }
        float[] cornerRadii = new float[4];
        getCornerRadiiMethod.invoke(view, (Object) cornerRadii);
        return new BorderRadii(
            fullBorderRadius, cornerRadii[0], cornerRadii[1], cornerRadii[2], cornerRadii[3]);
      } catch (NullPointerException
          | NoSuchFieldException
          | NoSuchMethodException
          | IllegalAccessException
          | InvocationTargetException ignored) {
        // In case of non-standard view is better to not support the border animation
        // instead of throwing exception
      }
    }
    return new BorderRadii(0, 0, 0, 0, 0);
  }
}
