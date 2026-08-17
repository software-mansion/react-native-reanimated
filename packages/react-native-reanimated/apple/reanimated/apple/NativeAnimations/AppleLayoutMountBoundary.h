#pragma once

#import <reanimated/LayoutAnimations/LayoutMountBoundary.h>

#import <React/RCTSurfacePresenter.h>

#import <memory>

namespace reanimated {

// The surface presenter calls the post-mount observer synchronously on the
// main queue, after the mount instructions and before paint.
std::shared_ptr<LayoutMountBoundary> makeAppleLayoutMountBoundary(RCTSurfacePresenter *surfacePresenter);

} // namespace reanimated
