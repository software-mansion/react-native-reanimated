/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "ScrollViewState.h"

namespace facebook::react {

ScrollViewState::ScrollViewState(
    Point contentOffset,
    Rect contentBoundingRect,
    int scrollAwayPaddingTop)
    : contentOffset(contentOffset),
      contentBoundingRect(contentBoundingRect),
      scrollAwayPaddingTop(scrollAwayPaddingTop) {}

Size ScrollViewState::getContentSize() const {
  return contentBoundingRect.size;
}

} // namespace facebook::react
