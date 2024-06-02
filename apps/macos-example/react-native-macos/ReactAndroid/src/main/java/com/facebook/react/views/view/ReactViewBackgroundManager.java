/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.react.views.view;

import android.graphics.Color;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.LayerDrawable;
import android.view.View;
import androidx.annotation.Nullable;
import androidx.core.view.ViewCompat;

/** Class that manages the background for views and borders. */
public class ReactViewBackgroundManager {

  private @Nullable ReactViewBackgroundDrawable mReactBackgroundDrawable;
  private View mView;
  private int mColor = Color.TRANSPARENT;

  public ReactViewBackgroundManager(View view) {
    this.mView = view;
  }

  public void cleanup() {
    ViewCompat.setBackground(mView, null);
    this.mView = null;
    this.mReactBackgroundDrawable = null;
  }

  private ReactViewBackgroundDrawable getOrCreateReactViewBackground() {
    if (mReactBackgroundDrawable == null) {
      mReactBackgroundDrawable = new ReactViewBackgroundDrawable(mView.getContext());
      Drawable backgroundDrawable = mView.getBackground();
      ViewCompat.setBackground(
          mView, null); // required so that drawable callback is cleared before we add the
      // drawable back as a part of LayerDrawable
      if (backgroundDrawable == null) {
        ViewCompat.setBackground(mView, mReactBackgroundDrawable);
      } else {
        LayerDrawable layerDrawable =
            new LayerDrawable(new Drawable[] {mReactBackgroundDrawable, backgroundDrawable});
        ViewCompat.setBackground(mView, layerDrawable);
      }
    }
    return mReactBackgroundDrawable;
  }

  public void setBackgroundColor(int color) {
    if (color == Color.TRANSPARENT && mReactBackgroundDrawable == null) {
      // don't do anything, no need to allocate ReactBackgroundDrawable for transparent background
    } else {
      getOrCreateReactViewBackground().setColor(color);
    }
  }

  public int getBackgroundColor() {
    return mColor;
  }

  public void setBorderWidth(int position, float width) {
    getOrCreateReactViewBackground().setBorderWidth(position, width);
  }

  public void setBorderColor(int position, float color, float alpha) {
    getOrCreateReactViewBackground().setBorderColor(position, color, alpha);
  }

  public int getBorderColor(int position) {
    return getOrCreateReactViewBackground().getBorderColor(position);
  }

  public void setBorderRadius(float borderRadius) {
    getOrCreateReactViewBackground().setRadius(borderRadius);
  }

  public void setBorderRadius(float borderRadius, int position) {
    getOrCreateReactViewBackground().setRadius(borderRadius, position);
  }

  public void setBorderStyle(@Nullable String style) {
    getOrCreateReactViewBackground().setBorderStyle(style);
  }
}
