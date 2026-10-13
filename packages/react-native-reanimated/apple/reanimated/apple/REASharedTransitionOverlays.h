#pragma once

#import <React/RCTSurfacePresenter.h>
#import <reanimated/Tools/PlatformDepMethodsHolder.h>

#if TARGET_OS_IOS

NS_ASSUME_NONNULL_BEGIN

// Keeps the view that holds the shared transition containers of a surface in a window above the window of the
// surface, so modals presented over the surface don't cover the transition.
@interface REASharedTransitionOverlays : NSObject <RCTSurfacePresenterObserver>

- (instancetype)initWithSurfacePresenter:(RCTSurfacePresenter *)surfacePresenter;

// The view is created by the mount that follows, so it is attached after that mount.
- (void)showOverlayWithTag:(NSInteger)tag surfaceId:(NSInteger)surfaceId;

// Detaches the overlay before the mount that deletes it.
- (void)hideOverlayForSurfaceId:(NSInteger)surfaceId;

- (reanimated::NativeViewPlacement)placementOfViewWithTag:(NSInteger)tag
                                                parentTag:(NSInteger)parentTag
                                                surfaceId:(NSInteger)surfaceId
                                                  settled:(BOOL)settled;

@end

NS_ASSUME_NONNULL_END

#endif // TARGET_OS_IOS
