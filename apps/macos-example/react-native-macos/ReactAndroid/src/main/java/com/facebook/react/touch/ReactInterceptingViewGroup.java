/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.react.touch;

import android.view.ViewGroup;

/**
 * This interface should be implemented by all {@link ViewGroup} subviews that can be instantiating
 * by {@link NativeViewHierarchyManager}. It is used to configure onInterceptTouch event listener
 * which then is used to control touch event flow in cases in which they requested to be intercepted
 * by some parent view based on a JS gesture detector.
 */
public interface ReactInterceptingViewGroup {

  /**
   * A {@link ViewGroup} instance that implement this interface is responsible for storing the
   * listener passed as an argument and then calling {@link
   * OnInterceptTouchEventListener#onInterceptTouchEvent} from {@link
   * ViewGroup#onInterceptTouchEvent} and returning the result. If some custom handling of this
   * method apply for the view, it should be called after the listener returns and only in a case
   * when it returns false.
   *
   * @param listener A callback that {@link ViewGroup} should delegate calls for {@link
   *     ViewGroup#onInterceptTouchEvent} to
   */
  void setOnInterceptTouchEventListener(OnInterceptTouchEventListener listener);
}
