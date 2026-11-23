#pragma once

#import <React/RCTSurfacePresenter.h>

// RN 0.89 deprecates addObserver:, but its replacement only registers ComponentViews.
// Reanimated's observers are external objects, so they must keep using this API.
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
static inline void REAAddSurfacePresenterObserver(
    RCTSurfacePresenter *surfacePresenter,
    id<RCTSurfacePresenterObserver> observer)
{
  [surfacePresenter addObserver:observer];
}
#pragma clang diagnostic pop
