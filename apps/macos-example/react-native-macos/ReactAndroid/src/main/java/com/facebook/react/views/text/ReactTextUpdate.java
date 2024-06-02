/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.react.views.text;

import static com.facebook.react.views.text.TextAttributeProps.UNSET;

import android.text.Layout;
import android.text.Spannable;

/**
 * Class that contains the data needed for a text update. Used by both <Text/> and <TextInput/>
 * VisibleForTesting from {@link TextInputEventsTestCase}.
 */
public class ReactTextUpdate {

  private final Spannable mText;
  private final int mJsEventCounter;
  private final boolean mContainsImages;
  private final float mPaddingLeft;
  private final float mPaddingTop;
  private final float mPaddingRight;
  private final float mPaddingBottom;
  private final int mTextAlign;
  private final int mTextBreakStrategy;
  private final int mJustificationMode;

  /**
   * @deprecated Use a non-deprecated constructor for ReactTextUpdate instead. This one remains
   *     because it's being used by a unit test that isn't currently open source.
   */
  @Deprecated
  public ReactTextUpdate(
      Spannable text,
      int jsEventCounter,
      boolean containsImages,
      float paddingStart,
      float paddingTop,
      float paddingEnd,
      float paddingBottom,
      int textAlign) {
    this(
        text,
        jsEventCounter,
        containsImages,
        paddingStart,
        paddingTop,
        paddingEnd,
        paddingBottom,
        textAlign,
        Layout.BREAK_STRATEGY_HIGH_QUALITY,
        Layout.JUSTIFICATION_MODE_NONE);
  }

  public ReactTextUpdate(
      Spannable text,
      int jsEventCounter,
      boolean containsImages,
      int textAlign,
      int textBreakStrategy,
      int justificationMode) {
    this(
        text,
        jsEventCounter,
        containsImages,
        UNSET,
        UNSET,
        UNSET,
        UNSET,
        textAlign,
        textBreakStrategy,
        justificationMode);
  }

  public ReactTextUpdate(
      Spannable text,
      int jsEventCounter,
      boolean containsImages,
      float paddingStart,
      float paddingTop,
      float paddingEnd,
      float paddingBottom,
      int textAlign,
      int textBreakStrategy,
      int justificationMode) {
    mText = text;
    mJsEventCounter = jsEventCounter;
    mContainsImages = containsImages;
    mPaddingLeft = paddingStart;
    mPaddingTop = paddingTop;
    mPaddingRight = paddingEnd;
    mPaddingBottom = paddingBottom;
    mTextAlign = textAlign;
    mTextBreakStrategy = textBreakStrategy;
    mJustificationMode = justificationMode;
  }

  public static ReactTextUpdate buildReactTextUpdateFromState(
      Spannable text,
      int jsEventCounter,
      int textAlign,
      int textBreakStrategy,
      int justificationMode) {

    ReactTextUpdate reactTextUpdate =
        new ReactTextUpdate(
            text, jsEventCounter, false, textAlign, textBreakStrategy, justificationMode);
    return reactTextUpdate;
  }

  public Spannable getText() {
    return mText;
  }

  public int getJsEventCounter() {
    return mJsEventCounter;
  }

  public boolean containsImages() {
    return mContainsImages;
  }

  public float getPaddingLeft() {
    return mPaddingLeft;
  }

  public float getPaddingTop() {
    return mPaddingTop;
  }

  public float getPaddingRight() {
    return mPaddingRight;
  }

  public float getPaddingBottom() {
    return mPaddingBottom;
  }

  public int getTextAlign() {
    return mTextAlign;
  }

  public int getTextBreakStrategy() {
    return mTextBreakStrategy;
  }

  public int getJustificationMode() {
    return mJustificationMode;
  }
}
