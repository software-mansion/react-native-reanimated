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

static CGPoint untransformedOrigin(CALayer *layer)
{
  return {
      layer.position.x - layer.bounds.size.width * layer.anchorPoint.x,
      layer.position.y - layer.bounds.size.height * layer.anchorPoint.y};
}

// The origin of the view in the coordinates of its window, with the transforms of its ancestors but not its own. React
// applies the transforms of the view and of its React ancestors itself. The current origin follows running animations,
// such as the dismissal of a sheet released by a swipe.
static CGPoint originInWindow(UIView *view, BOOL current)
{
  CALayer *layer = view.layer;
  CALayer *superlayer = view.superview.layer;
  CALayer *windowLayer = view.window.layer;
  if (current) {
    layer = layer.presentationLayer ?: layer;
    superlayer = superlayer.presentationLayer ?: superlayer;
    windowLayer = windowLayer.presentationLayer ?: windowLayer;
  }
  return [superlayer convertPoint:untransformedOrigin(layer) toLayer:windowLayer];
}

// The rotation, scale and skew from the space of one layer to the space of another, without the translation.
static facebook::react::Transform linearTransform(CALayer *from, CALayer *to)
{
  const CGPoint origin = [from convertPoint:CGPointZero toLayer:to];
  const CGPoint x = [from convertPoint:CGPointMake(1, 0) toLayer:to];
  const CGPoint y = [from convertPoint:CGPointMake(0, 1) toLayer:to];
  facebook::react::Transform transform;
  transform.matrix[0] = x.x - origin.x;
  transform.matrix[1] = x.y - origin.y;
  transform.matrix[4] = y.x - origin.x;
  transform.matrix[5] = y.y - origin.y;
  return facebook::react::Transform::FromTransformOperation(
      facebook::react::TransformOperation(facebook::react::TransformOperationType::Arbitrary), {}, transform);
}

static facebook::react::Transform ancestorTransformInWindow(UIView *view, BOOL current)
{
  CALayer *superlayer = view.superview.layer;
  CALayer *windowLayer = view.window.layer;
  if (current) {
    superlayer = superlayer.presentationLayer ?: superlayer;
    windowLayer = windowLayer.presentationLayer ?: windowLayer;
  }
  return linearTransform(superlayer, windowLayer);
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

// A container view controller, such as a navigation controller, moves the views of its children in its own
// transitions. A shared transition does not follow these transitions.
static BOOL isViewControllerView(UIView *view)
{
  return [view.nextResponder isKindOfClass:[UIViewController class]];
}

static BOOL movesSublayers(CALayer *layer)
{
  return !CGPointEqualToPoint(untransformedOrigin(layer), CGPointZero) || !CATransform3DIsIdentity(layer.transform);
}

// React knows the scroll offset of a scroll view, but not the frames and the transforms of native views between a view
// and its React parent, e.g. the sheet of a bottom sheet.
static BOOL isMovedByNativeViews(UIView *view, UIView *reactParent)
{
  for (UIView *current = view.superview; current != reactParent; current = current.superview) {
    CALayer *presentationLayer = current.layer.presentationLayer;
    if (movesSublayers(current.layer) || (presentationLayer && movesSublayers(presentationLayer))) {
      return YES;
    }
  }
  return NO;
}

// The native views between a view and its React parent can move with a Core Animation animation, so the placement uses
// their current values.
static reanimated::NativeViewPlacement placementInReactParent(UIView *view, UIView *reactParent)
{
  CALayer *superlayer = view.superview.layer.presentationLayer ?: view.superview.layer;
  CALayer *parentLayer = reactParent.layer.presentationLayer ?: reactParent.layer;
  const CGPoint origin = [superlayer convertPoint:untransformedOrigin(view.layer) toLayer:parentLayer];
  return {
      .kind = reanimated::NativeViewPlacement::Kind::MovedInsideReactParent,
      .origin = {origin.x, origin.y},
      .transform = linearTransform(superlayer, parentLayer)};
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
  UIView *overlay = [self viewWithTag:tag.integerValue];
  overlay.layer.zPosition = 0;
  overlay.accessibilityElementsHidden = NO;
  [overlay removeFromSuperview];
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
  if (overlay.superview != window) {
    overlay.accessibilityElementsHidden = YES;
    // UIKit can insert a modal's presentation container after the overlay.
    overlay.layer.zPosition = 1;
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
    return {.kind = reanimated::NativeViewPlacement::Kind::OffWindow};
  }
  UIView *rootView = [self viewWithTag:surfaceId];
  if (view.window != surfaceWindow(rootView)) {
    return {.kind = reanimated::NativeViewPlacement::Kind::DifferentWindow};
  }
  if (view.superview == parent) {
    return {.kind = reanimated::NativeViewPlacement::Kind::InsideReactParent};
  }
  if ([view isDescendantOfView:parent]) {
    if (isViewControllerView(view) || !isMovedByNativeViews(view, parent)) {
      return {.kind = reanimated::NativeViewPlacement::Kind::InsideReactParent};
    }
    return placementInReactParent(view, parent);
  }
  CGPoint viewOrigin = originInWindow(view, !settled);
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
      .kind = reanimated::NativeViewPlacement::Kind::OutsideReactParent,
      .origin = {viewOrigin.x - rootOrigin.x, viewOrigin.y - rootOrigin.y},
      .transform = ancestorTransformInWindow(view, !settled)};
}

@end

#endif // TARGET_OS_IOS
