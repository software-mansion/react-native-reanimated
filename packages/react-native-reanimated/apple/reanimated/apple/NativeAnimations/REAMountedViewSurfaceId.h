#pragma once

#import <reanimated/apple/REAUIView.h>

#import <React/RCTComponent.h>
#import <react/renderer/core/ReactPrimitives.h>

namespace reanimated::native_animation {

// Returns the surface id of the root view that contains `view`, or -1 when
// the view is not mounted under a React root view.
inline facebook::react::SurfaceId surfaceIdForMountedView(REAUIView *view) {
  while (view != nil) {
    if (RCTIsReactRootView(@(view.tag))) {
      return static_cast<facebook::react::SurfaceId>(view.tag);
    }
    view = view.superview;
  }
  return -1;
}

} // namespace reanimated::native_animation
