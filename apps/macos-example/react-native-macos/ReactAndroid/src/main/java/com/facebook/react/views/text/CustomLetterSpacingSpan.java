/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.react.views.text;

import android.text.TextPaint;
import android.text.style.MetricAffectingSpan;

/**
 * A {@link MetricAffectingSpan} that allows to set the letter spacing on the selected text span.
 *
 * <p>The letter spacing is specified in pixels, which are converted to ems at paint time; this span
 * must therefore be applied after any spans affecting font size.
 */
public class CustomLetterSpacingSpan extends MetricAffectingSpan implements ReactSpan {

  private final float mLetterSpacing;

  public CustomLetterSpacingSpan(float letterSpacing) {
    mLetterSpacing = letterSpacing;
  }

  @Override
  public void updateDrawState(TextPaint paint) {
    apply(paint);
  }

  @Override
  public void updateMeasureState(TextPaint paint) {
    apply(paint);
  }

  public float getSpacing() {
    return mLetterSpacing;
  }

  private void apply(TextPaint paint) {
    if (!Float.isNaN(mLetterSpacing)) {
      paint.setLetterSpacing(mLetterSpacing);
    }
  }
}
