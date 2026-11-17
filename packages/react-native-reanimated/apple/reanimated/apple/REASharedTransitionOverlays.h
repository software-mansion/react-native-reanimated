#pragma once

#import <React/RCTSurfacePresenter.h>
#import <reanimated/Tools/PlatformDepMethodsHolder.h>

#if TARGET_OS_IOS

NS_ASSUME_NONNULL_BEGIN

// Attaches the view that holds the carriers of a surface to the window of the surface,
// at a zPosition above the presentation containers of modals, so modals presented over the surface don't cover the
// transition.
@interface REASharedTransitionOverlays : NSObject <RCTSurfacePresenterObserver>

- (instancetype)initWithSurfacePresenter:(RCTSurfacePresenter *)surfacePresenter;

// Attaches the overlay before and after each mount, once a mount has created it.
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
