#import <reanimated/apple/REASharedTransitionOverlays.h>

#if TARGET_OS_IOS

#import <React/RCTAssert.h>
#import <React/RCTComponentViewRegistry.h>
#import <React/RCTMountingManager.h>
#import <React/UIView+React.h>

// The frame of the view in the coordinates of its window, without the transforms of the view and its ancestors. A
// sheet scales the view that presents it, which must not move the overlay or the measured screens.
static CGRect untransformedFrameInWindow(UIView *view)
{
  CGRect frame = {CGPointZero, view.bounds.size};
  for (UIView *current = view; current.superview; current = current.superview) {
    const CGPoint anchor = current.layer.anchorPoint;
    const CGRect parentBounds = current.superview.bounds;
    frame.origin.x += current.center.x - current.bounds.size.width * anchor.x - parentBounds.origin.x;
    frame.origin.y += current.center.y - current.bounds.size.height * anchor.y - parentBounds.origin.y;
  }
  return frame;
}

// A full screen presentation removes the presenting views from the window, so the window that shows a surface is
// then the one of the view controller presented over it.
static UIWindow *surfaceWindow(UIView *rootView)
{
  if (rootView.window) {
    return rootView.window;
  }
  for (UIViewController *presented = rootView.reactViewController.presentedViewController; presented;
       presented = presented.presentedViewController) {
    if (presented.viewIfLoaded.window) {
      return presented.viewIfLoaded.window;
    }
  }
  return nil;
}

@implementation REASharedTransitionOverlays {
  __weak RCTSurfacePresenter *_surfacePresenter;
  NSMutableDictionary<NSNumber *, NSNumber *> *_overlayTags;
}

- (instancetype)initWithSurfacePresenter:(RCTSurfacePresenter *)surfacePresenter
{
  if (self = [super init]) {
    _surfacePresenter = surfacePresenter;
    _overlayTags = [NSMutableDictionary new];
    // `addObserver:` is deprecated, but its replacement has no hook for an external observer.
    // See `REAPseudoSelectorAttachQueue`.
    [surfacePresenter addObserver:self];
  }
  return self;
}

- (void)dealloc
{
  [_surfacePresenter removeObserver:self];
}

- (UIView *)viewWithTag:(NSInteger)tag
{
  RCTComponentViewRegistry *registry = _surfacePresenter.mountingManager.componentViewRegistry;
  return [registry findComponentViewWithTag:static_cast<facebook::react::Tag>(tag)];
}

- (void)showOverlayWithTag:(NSInteger)tag surfaceId:(NSInteger)surfaceId
{
  RCTAssertMainQueue();
  _overlayTags[@(surfaceId)] = @(tag);
}

- (void)hideOverlayForSurfaceId:(NSInteger)surfaceId
{
  RCTAssertMainQueue();
  NSNumber *tag = _overlayTags[@(surfaceId)];
  if (!tag) {
    return;
  }
  [_overlayTags removeObjectForKey:@(surfaceId)];
  [[self viewWithTag:tag.integerValue] removeFromSuperview];
}

- (void)didMountComponentsWithRootTag:(NSInteger)rootTag
{
  RCTAssertMainQueue();
  NSNumber *tag = _overlayTags[@(rootTag)];
  UIView *overlay = tag ? [self viewWithTag:tag.integerValue] : nil;
  if (!overlay) {
    return;
  }
  UIView *rootView = [self viewWithTag:rootTag];
  UIWindow *window = surfaceWindow(rootView);
  if (!window) {
    return;
  }
  overlay.accessibilityElementsHidden = YES;
  // UIKit can insert a modal's presentation container after the overlay.
  overlay.layer.zPosition = 1;
  if (overlay.superview != window) {
    [window addSubview:overlay];
  }
  overlay.frame = untransformedFrameInWindow(rootView);
}

- (reanimated::NativeViewPlacement)placementOfViewWithTag:(NSInteger)tag
                                                parentTag:(NSInteger)parentTag
                                                surfaceId:(NSInteger)surfaceId
                                                  settled:(BOOL)settled
{
  RCTAssertMainQueue();
  UIView *view = [self viewWithTag:tag];
  UIView *parent = [self viewWithTag:parentTag];
  if (!view.window || !parent) {
    return {.kind = reanimated::NativeViewPlacement::Kind::Detached};
  }
  if ([view isDescendantOfView:parent]) {
    return {.kind = reanimated::NativeViewPlacement::Kind::InsideParent};
  }
  UIView *rootView = [self viewWithTag:surfaceId];
  if (view.window != surfaceWindow(rootView)) {
    return {.kind = reanimated::NativeViewPlacement::Kind::Detached};
  }
  CGPoint viewOrigin = untransformedFrameInWindow(view).origin;
  UIViewController *presented = view.reactViewController;
  while (presented.parentViewController) {
    presented = presented.parentViewController;
  }
  // A presentation animates the presented view, so a target inside it is measured at the presentation's settled frame.
  if (settled && presented.presentingViewController) {
    UIPresentationController *presentationController = presented.presentationController;
    UIView *presentedView = presentationController.presentedView;
    UIView *containerView = presentationController.containerView;
    if (containerView && [view isDescendantOfView:presentedView]) {
      const CGPoint presentedOrigin = untransformedFrameInWindow(presentedView).origin;
      const CGPoint containerOrigin = untransformedFrameInWindow(containerView).origin;
      const CGPoint settledOrigin = presentationController.frameOfPresentedViewInContainerView.origin;
      viewOrigin.x += containerOrigin.x - containerView.bounds.origin.x + settledOrigin.x - presentedOrigin.x;
      viewOrigin.y += containerOrigin.y - containerView.bounds.origin.y + settledOrigin.y - presentedOrigin.y;
    }
  }
  const CGPoint rootOrigin = untransformedFrameInWindow(rootView).origin;
  return {
      .kind = reanimated::NativeViewPlacement::Kind::Reparented,
      .origin = {viewOrigin.x - rootOrigin.x, viewOrigin.y - rootOrigin.y}};
}

@end

#endif // TARGET_OS_IOS
