#import <reanimated/Tools/PlatformDepMethodsHolder.h>
#import <reanimated/apple/CSS/REACSSPlatformTransitions.h>
#import <reanimated/apple/READisplayLink.h>
#import <reanimated/apple/REANodesManager.h>
#import <reanimated/apple/REASlowAnimations.h>
#import <reanimated/apple/REAUIView.h>
#import <reanimated/apple/RNGestureHandlerStateManager.h>
#import <reanimated/apple/keyboardObserver/REAKeyboardEventObserver.h>
#import <reanimated/apple/native/SetGestureState.h>
#import <reanimated/apple/pseudoSelectors/REAPseudoSelectorAttachQueue.h>
#import <reanimated/apple/sensor/ReanimatedSensorContainer.h>

#import <React/RCTComponentViewProtocol.h>
#import <React/RCTComponentViewRegistry.h>
#import <React/RCTMountingManager.h>

@protocol RNScreenViewOptionalProtocol <NSObject>
@required
- (void)setSnapshotAfterUpdates:(BOOL)snapshot;
@end

#if !TARGET_OS_OSX
// A purely-visual overlay view: it never steals touches so the app/modal underneath stays
// interactive while a SET container morphs on top of it. Lives at global scope because Objective-C
// declarations cannot appear inside the reanimated C++ namespace.
@interface REASETOverlayPassthroughView : UIView
@end

@implementation REASETOverlayPassthroughView
- (UIView *)hitTest:(CGPoint)point withEvent:(UIEvent *)event
{
  return nil;
}
@end

// MARK: - REASETMirrorManager
//
// Renders a live MIRROR of each Shared Element Transition container above a presented modal, without
// touching the real container view. SET mounts its container views at the surface root; an iOS modal
// is presented in its own UIViewController above that root, so a root-mounted container renders BEHIND
// the modal and its morph is invisible. Moving the real view into an overlay would desync Fabric's
// view-ownership (mount/unmountChildComponentView assert on superview + index) and crash on cleanup.
//
// Instead, while a modal transition runs we keep a clear, non-interactive overlay window above
// UIWindowLevelAlert and, on every CADisplayLink frame, copy each tracked container's rendered pixels
// (renderInContext captures its whole subtree, with its own borderRadius/clipping) and geometry
// (bounds / anchorPoint / position / transform, converted into the overlay's coordinate space) into a
// CALayer in the overlay. The real container stays exactly where Fabric put it, so unmount/cleanup is
// unaffected; the mirror is our layer and we tear it down ourselves. Lives at global scope because
// Objective-C declarations cannot appear inside the reanimated C++ namespace.
@interface REASETMirrorManager : NSObject
@property (nonatomic, weak) REANodesManager *nodesManager;
@end

@implementation REASETMirrorManager {
  UIWindow *_overlayWindow;
  NSMutableArray<NSNumber *> *_tags; // container tags to mirror, in begin order
  NSMutableDictionary<NSNumber *, CALayer *> *_mirrors; // tag -> mirror layer
  NSMutableDictionary<NSNumber *, NSNumber *> *_missingFrames; // tag -> consecutive frames the view was missing
  NSMutableDictionary<NSNumber *, NSNumber *> *_destTags; // container tag -> real destination view tag
  NSMutableDictionary<NSNumber *, NSValue *> *_destCenters; // container tag -> destination center (surface coords)
  NSMutableDictionary<NSNumber *, NSValue *> *_smoothedOffsets; // container tag -> eased destination offset (window)
  CADisplayLink *_displayLink;
}

+ (instancetype)sharedManager
{
  static REASETMirrorManager *manager = nil;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{ manager = [[REASETMirrorManager alloc] init]; });
  return manager;
}

- (instancetype)init
{
  if (self = [super init]) {
    _tags = [NSMutableArray array];
    _mirrors = [NSMutableDictionary dictionary];
    _missingFrames = [NSMutableDictionary dictionary];
    _destTags = [NSMutableDictionary dictionary];
    _destCenters = [NSMutableDictionary dictionary];
    _smoothedOffsets = [NSMutableDictionary dictionary];
  }
  return self;
}

- (RCTComponentViewRegistry *)registry
{
  return self.nodesManager.surfacePresenter.mountingManager.componentViewRegistry;
}

// Start mirroring a container tag. Idempotent across the reuse path / repeated commits. The container
// view is usually not mounted yet (its CreateMutation is applied after this transaction), so we just
// register the tag and let the display link pick it up once it appears.
- (void)beginMirroringTag:(NSInteger)tag destTag:(NSInteger)destTag destCenter:(CGPoint)destCenter
{
  NSNumber *key = @(tag);
  if (![_tags containsObject:key]) {
    [_tags addObject:key];
  }
  _missingFrames[key] = @(0);
  _destTags[key] = @(destTag);
  _destCenters[key] = [NSValue valueWithCGPoint:destCenter];
  if (_displayLink == nil) {
    _displayLink = [CADisplayLink displayLinkWithTarget:self selector:@selector(tick)];
    [_displayLink addToRunLoop:[NSRunLoop mainRunLoop] forMode:NSRunLoopCommonModes];
  }
}

// The real destination view's center in window coordinates, or {valid:NO} if it isn't mounted yet.
- (CGPoint)windowCenterForTag:(NSInteger)tag valid:(BOOL *)valid
{
  UIView *view = [[self registry] findComponentViewWithTag:tag];
  if (view == nil || view.window == nil) {
    *valid = NO;
    return CGPointZero;
  }
  *valid = YES;
  return [view convertPoint:CGPointMake(CGRectGetMidX(view.bounds), CGRectGetMidY(view.bounds)) toView:nil];
}

- (UIWindow *)ensureOverlayAnchoredTo:(UIView *)anchor
{
  UIWindow *anchorWindow = anchor.window;
  CGRect bounds = anchorWindow != nil ? anchorWindow.bounds : UIScreen.mainScreen.bounds;
  if (_overlayWindow == nil) {
    UIWindowScene *scene = anchorWindow.windowScene;
    if (scene != nil) {
      _overlayWindow = [[UIWindow alloc] initWithWindowScene:scene];
    } else {
      _overlayWindow = [[UIWindow alloc] initWithFrame:bounds];
    }
    _overlayWindow.windowLevel = UIWindowLevelAlert + 1;
    _overlayWindow.backgroundColor = [UIColor clearColor];
    _overlayWindow.userInteractionEnabled = NO;
    UIViewController *vc = [[UIViewController alloc] init];
    REASETOverlayPassthroughView *root = [[REASETOverlayPassthroughView alloc] initWithFrame:bounds];
    root.backgroundColor = [UIColor clearColor];
    root.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    vc.view = root;
    _overlayWindow.rootViewController = vc;
  } else if (anchorWindow != nil && _overlayWindow.windowScene != anchorWindow.windowScene) {
    _overlayWindow.windowScene = anchorWindow.windowScene;
  }
  _overlayWindow.frame = bounds;
  _overlayWindow.hidden = NO;
  return _overlayWindow;
}

- (void)tick
{
  if (_tags.count == 0) {
    [self stop];
    return;
  }
  RCTComponentViewRegistry *registry = [self registry];
  NSMutableArray<NSNumber *> *toDrop = [NSMutableArray array];

  for (NSNumber *key in [_tags copy]) {
    UIView *container = [registry findComponentViewWithTag:key.integerValue];
    UIView *superview = container.superview;
    BOOL laidOut = container != nil && superview != nil && container.bounds.size.width > 0 &&
        container.bounds.size.height > 0;
    if (!laidOut) {
      // Not (yet / any longer) mounted & laid out. Tolerate transient misses between commits; after a
      // short grace window assume the container is gone and drop its mirror. This is also the safety
      // net that stops the display link if endAll is never called (e.g. an interrupted transition).
      NSInteger misses = _missingFrames[key].integerValue + 1;
      _missingFrames[key] = @(misses);
      if (misses > 6) {
        [toDrop addObject:key];
      }
      continue;
    }
    _missingFrames[key] = @(0);

    UIView *overlayRoot = [self ensureOverlayAnchoredTo:container].rootViewController.view;

    CALayer *mirror = _mirrors[key];
    if (mirror == nil) {
      mirror = [CALayer layer];
      _mirrors[key] = mirror;
      [overlayRoot.layer addSublayer:mirror];
    }

    // 1) Pixels: render the container (and its subtree) into an image at its current appearance. This
    // renders in the layer's own coordinate space, so the container's own transform is NOT baked in -
    // we apply that to the mirror layer below.
    CGSize size = container.bounds.size;
    UIGraphicsImageRendererFormat *format = [UIGraphicsImageRendererFormat preferredFormat];
    format.opaque = NO;
    UIGraphicsImageRenderer *renderer = [[UIGraphicsImageRenderer alloc] initWithSize:size format:format];
    UIImage *image = [renderer imageWithActions:^(UIGraphicsImageRendererContext *_Nonnull ctx) {
      [container.layer renderInContext:ctx.CGContext];
    }];

    // 2) Geometry: convert the container's position (its anchorPoint location, in its superview's
    // space) into the overlay's space via window base coordinates - the container and the overlay live
    // in different (full-screen, aligned) windows, so a two-step window conversion is robust.
    CGPoint posInWindow = [superview convertPoint:container.center toView:nil];
    // Anchor the morph to where the real destination view actually is on screen. An iOS modal CARD is
    // presented inset from the top (and a screen's layout can differ source-vs-destination), so the
    // container mounted at the surface root sits in the wrong place. The target offset is (real
    // destination window position - its surface-root center, in window space); it is zero for a
    // non-inset destination and until the destination mounts in a window. The modal presents
    // asynchronously, so the destination only becomes measurable partway through the morph - ease the
    // offset in so the shared element glides onto the card instead of snapping when it appears.
    CGPoint targetOffset = CGPointZero;
    NSNumber *destTag = _destTags[key];
    NSValue *destCenterValue = _destCenters[key];
    if (destTag != nil && destCenterValue != nil) {
      BOOL destValid = NO;
      CGPoint destReal = [self windowCenterForTag:destTag.integerValue valid:&destValid];
      if (destValid) {
        CGPoint destCenterInWindow = [superview convertPoint:destCenterValue.CGPointValue toView:nil];
        targetOffset.x = destReal.x - destCenterInWindow.x;
        targetOffset.y = destReal.y - destCenterInWindow.y;
      }
    }
    CGPoint offset = targetOffset;
    NSValue *prevOffset = _smoothedOffsets[key];
    if (prevOffset != nil) {
      CGPoint p = prevOffset.CGPointValue;
      offset.x = p.x + (targetOffset.x - p.x) * 0.25;
      offset.y = p.y + (targetOffset.y - p.y) * 0.25;
    }
    _smoothedOffsets[key] = [NSValue valueWithCGPoint:offset];
    posInWindow.x += offset.x;
    posInWindow.y += offset.y;
    CGPoint posInOverlay = [overlayRoot convertPoint:posInWindow fromView:nil];

    [CATransaction begin];
    [CATransaction setDisableActions:YES];
    mirror.contents = (__bridge id)image.CGImage;
    mirror.contentsScale = image.scale;
    mirror.bounds = container.bounds;
    mirror.anchorPoint = container.layer.anchorPoint;
    mirror.position = posInOverlay;
    mirror.transform = container.layer.transform;
    mirror.opacity = container.layer.opacity;
    [CATransaction commit];
  }

  for (NSNumber *key in toDrop) {
    [self dropTag:key];
  }
  if (_tags.count == 0) {
    [self stop];
  }
}

- (void)dropTag:(NSNumber *)key
{
  [_mirrors[key] removeFromSuperlayer];
  [_mirrors removeObjectForKey:key];
  [_missingFrames removeObjectForKey:key];
  [_destTags removeObjectForKey:key];
  [_destCenters removeObjectForKey:key];
  [_smoothedOffsets removeObjectForKey:key];
  [_tags removeObject:key];
}

// Tear down every mirror and stop. Called from cleanupSharedTransitions when the transition ends.
- (void)endAll
{
  [self stop];
}

- (void)stop
{
  [_displayLink invalidate];
  _displayLink = nil;
  for (CALayer *mirror in _mirrors.allValues) {
    [mirror removeFromSuperlayer];
  }
  [_mirrors removeAllObjects];
  [_missingFrames removeAllObjects];
  [_destTags removeAllObjects];
  [_destCenters removeAllObjects];
  [_smoothedOffsets removeAllObjects];
  [_tags removeAllObjects];
  _overlayWindow.hidden = YES;
}

@end
#endif // !TARGET_OS_OSX

namespace reanimated {

using namespace facebook;
using namespace react;

SetGestureStateFunction makeSetGestureStateFunction(RCTModuleRegistry *moduleRegistry)
{
  id<RNGestureHandlerStateManager> gestureHandlerStateManager = nil;
  auto setGestureStateFunction = [gestureHandlerStateManager, moduleRegistry](int handlerTag, int newState) mutable {
    if (gestureHandlerStateManager == nil) {
      gestureHandlerStateManager = [moduleRegistry moduleForName:"RNGestureHandlerModule"];
    }
    setGestureState(gestureHandlerStateManager, handlerTag, newState);
  };
  return setGestureStateFunction;
}

RequestRenderFunction makeRequestRender(REANodesManager *nodesManager)
{
  auto requestRender = [nodesManager](std::function<void(double)> onRender) {
    [nodesManager postOnAnimation:^(READisplayLink *displayLink) {
#if !TARGET_OS_OSX
      auto targetTimestamp = displayLink.targetTimestamp;
#else
      // TODO macOS targetTimestamp isn't available on macOS
      auto targetTimestamp = displayLink.timestamp + displayLink.duration;
#endif
      const double frameTimestamp = calculateTimestampWithSlowAnimations(targetTimestamp) * 1000;
      onRender(frameTimestamp);
    }];
  };

  return requestRender;
}

SynchronouslyUpdateUIPropsFunction makeSynchronouslyUpdateUIPropsFunction(REANodesManager *nodesManager)
{
  auto synchronouslyUpdateUIPropsFunction = [nodesManager](const int viewTag, const folly::dynamic &props) {
    [nodesManager synchronouslyUpdateUIProps:viewTag props:props];
  };
  return synchronouslyUpdateUIPropsFunction;
}

GetAnimationTimestampFunction makeGetAnimationTimestamp()
{
  auto getAnimationTimestamp = []() {
    return calculateTimestampWithSlowAnimations(CACurrentMediaTime()) * 1000;
  };
  return getAnimationTimestamp;
}

MaybeFlushUIUpdatesQueueFunction makeMaybeFlushUIUpdatesQueueFunction(REANodesManager *nodesManager)
{
  auto maybeFlushUIUpdatesQueueFunction = [nodesManager]() {
    [nodesManager maybeFlushUIUpdatesQueue];
  };
  return maybeFlushUIUpdatesQueueFunction;
}

RegisterSensorFunction makeRegisterSensorFunction(ReanimatedSensorContainer *reanimatedSensorContainer)
{
  auto registerSensorFunction =
      [=](int sensorType, int interval, int iosReferenceFrame, std::function<void(double[], int)> setter) -> int {
    return [reanimatedSensorContainer
           registerSensor:(ReanimatedSensorType)sensorType
                 interval:interval
        iosReferenceFrame:iosReferenceFrame
                   setter:^(double *data, int orientationDegrees) { setter(data, orientationDegrees); }];
  };
  return registerSensorFunction;
}

UnregisterSensorFunction makeUnregisterSensorFunction(ReanimatedSensorContainer *reanimatedSensorContainer)
{
  auto unregisterSensorFunction = [=](int sensorId) {
    [reanimatedSensorContainer unregisterSensor:sensorId];
  };
  return unregisterSensorFunction;
}

KeyboardEventSubscribeFunction makeSubscribeForKeyboardEventsFunction(REAKeyboardEventObserver *keyboardObserver)
{
  auto subscribeForKeyboardEventsFunction =
      [=](std::function<void(int keyboardState, int height)> keyboardEventDataUpdater,
          bool isStatusBarTranslucent,
          bool isNavigationBarTranslucent) {
        // ignore isStatusBarTranslucent and isNavigationBarTranslucent - those are Android only
        return [keyboardObserver subscribeForKeyboardEvents:^(int keyboardState, int height) {
          keyboardEventDataUpdater(keyboardState, height);
        }];
      };
  return subscribeForKeyboardEventsFunction;
}

KeyboardEventUnsubscribeFunction makeUnsubscribeFromKeyboardEventsFunction(REAKeyboardEventObserver *keyboardObserver)
{
  auto unsubscribeFromKeyboardEventsFunction = [=](int listenerId) {
    [keyboardObserver unsubscribeFromKeyboardEvents:listenerId];
  };
  return unsubscribeFromKeyboardEventsFunction;
}

css::CSSCanRoutePropertyFunction makeCSSCanRouteProperty()
{
  return &canRouteCSSProperty;
}

css::CSSApplyTransitionFunction makeCSSApplyTransition(REACSSPlatformTransitions *platformTransitions)
{
  return [platformTransitions](const css::CSSPlatformTransitionPropertyConfig &config) {
    [platformTransitions applyTransition:config];
  };
}

css::CSSRemoveTransitionFunction makeCSSRemoveTransition(REACSSPlatformTransitions *platformTransitions)
{
  return [platformTransitions](Tag viewTag, const std::string &propertyName) {
    [platformTransitions removeTransitionForTag:viewTag
                                   propertyName:[NSString stringWithUTF8String:propertyName.c_str()]];
  };
}

ForceScreenSnapshotFunction makeForceScreenSnapshotFunction(REANodesManager *nodesManager)
{
  auto forceScreenSnapshot = [=](Tag tag) {
    RCTSurfacePresenter *surfacePresenter = nodesManager.surfacePresenter;
    RCTComponentViewRegistry *componentViewRegistry = surfacePresenter.mountingManager.componentViewRegistry;
    REAUIView<RCTComponentViewProtocol> *maybeRNSScreenView = [componentViewRegistry findComponentViewWithTag:tag];
    SEL setSnapshotAfterUpdatesSelector = @selector(setSnapshotAfterUpdates:);
    if ([maybeRNSScreenView respondsToSelector:setSnapshotAfterUpdatesSelector]) {
      [(id<RNScreenViewOptionalProtocol>)maybeRNSScreenView setSnapshotAfterUpdates:YES];
    }
  };
  return forceScreenSnapshot;
}

BeginModalMirrorFunction makeBeginModalMirrorFunction(REANodesManager *nodesManager)
{
#if !TARGET_OS_OSX
  return [nodesManager](Tag tag, Tag destTag, double destCenterX, double destCenterY) {
    // May run off the main thread; UIKit + CADisplayLink work must happen on main. The container view
    // is typically not mounted yet (its CreateMutation is applied after this transaction), so the
    // manager only registers the tag here - its display link starts mirroring once the view appears.
    CGPoint destCenter = CGPointMake(destCenterX, destCenterY);
    dispatch_async(dispatch_get_main_queue(), ^{
      REASETMirrorManager *manager = [REASETMirrorManager sharedManager];
      manager.nodesManager = nodesManager;
      [manager beginMirroringTag:(NSInteger)tag destTag:(NSInteger)destTag destCenter:destCenter];
    });
  };
#else
  (void)nodesManager;
  return [](Tag, Tag, double, double) {
  };
#endif // !TARGET_OS_OSX
}

EndModalMirrorsFunction makeEndModalMirrorsFunction(REANodesManager *nodesManager)
{
  (void)nodesManager;
#if !TARGET_OS_OSX
  return []() {
    void (^block)(void) = ^{
      [[REASETMirrorManager sharedManager] endAll];
    };
    if ([NSThread isMainThread]) {
      block();
    } else {
      dispatch_async(dispatch_get_main_queue(), block);
    }
  };
#else
  return []() {
  };
#endif // !TARGET_OS_OSX
}

PlatformAttachPseudoSelectorFunction makeAttachPseudoSelectorFunction(REAPseudoSelectorAttachQueue *attachQueue)
{
  return [attachQueue](Tag tag, PseudoSelector selector, std::function<void(bool)> callback) {
    auto sharedCallback = std::make_shared<std::function<void(bool)>>(std::move(callback));
    dispatch_async(
        dispatch_get_main_queue(), ^{ [attachQueue attachTag:tag selector:selector sharedCallback:sharedCallback]; });
  };
}

PlatformDetachPseudoSelectorFunction makeDetachPseudoSelectorFunction(REAPseudoSelectorAttachQueue *attachQueue)
{
  return [attachQueue](Tag tag, PseudoSelector selector) {
    dispatch_async(dispatch_get_main_queue(), ^{ [attachQueue detachTag:tag selector:selector]; });
  };
}

PlatformDepMethodsHolder makePlatformDepMethodsHolder(RCTModuleRegistry *moduleRegistry, REANodesManager *nodesManager)
{
  auto requestRender = makeRequestRender(nodesManager);

  auto forceScreenSnapshotFunction = makeForceScreenSnapshotFunction(nodesManager);

  auto beginModalMirrorFunction = makeBeginModalMirrorFunction(nodesManager);

  auto endModalMirrorsFunction = makeEndModalMirrorsFunction(nodesManager);

  auto synchronouslyUpdateUIPropsFunction = makeSynchronouslyUpdateUIPropsFunction(nodesManager);

  auto getAnimationTimestamp = makeGetAnimationTimestamp();

  ReanimatedSensorContainer *reanimatedSensorContainer = [[ReanimatedSensorContainer alloc] init];

  auto registerSensorFunction = makeRegisterSensorFunction(reanimatedSensorContainer);

  auto unregisterSensorFunction = makeUnregisterSensorFunction(reanimatedSensorContainer);

  auto setGestureStateFunction = makeSetGestureStateFunction(moduleRegistry);

  REAKeyboardEventObserver *keyboardObserver = [[REAKeyboardEventObserver alloc] init];

  auto subscribeForKeyboardEventsFunction = makeSubscribeForKeyboardEventsFunction(keyboardObserver);

  auto unsubscribeFromKeyboardEventsFunction = makeUnsubscribeFromKeyboardEventsFunction(keyboardObserver);

  auto maybeFlushUIUpdatesQueueFunction = makeMaybeFlushUIUpdatesQueueFunction(nodesManager);

  REAPseudoSelectorAttachQueue *attachQueue =
      [[REAPseudoSelectorAttachQueue alloc] initWithSurfacePresenter:nodesManager.surfacePresenter];
  auto attachPseudoSelectorFunction = makeAttachPseudoSelectorFunction(attachQueue);
  auto detachPseudoSelectorFunction = makeDetachPseudoSelectorFunction(attachQueue);

  REACSSPlatformTransitions *platformTransitions =
      [[REACSSPlatformTransitions alloc] initWithSurfacePresenter:nodesManager.surfacePresenter];
  auto cssCanRouteProperty = makeCSSCanRouteProperty();
  auto cssApplyTransition = makeCSSApplyTransition(platformTransitions);
  auto cssRemoveTransition = makeCSSRemoveTransition(platformTransitions);

  PlatformDepMethodsHolder platformDepMethodsHolder = {
      requestRender,
      forceScreenSnapshotFunction,
      beginModalMirrorFunction,
      endModalMirrorsFunction,
      synchronouslyUpdateUIPropsFunction,
      getAnimationTimestamp,
      registerSensorFunction,
      unregisterSensorFunction,
      setGestureStateFunction,
      subscribeForKeyboardEventsFunction,
      unsubscribeFromKeyboardEventsFunction,
      maybeFlushUIUpdatesQueueFunction,
      attachPseudoSelectorFunction,
      detachPseudoSelectorFunction,
      cssCanRouteProperty,
      cssApplyTransition,
      cssRemoveTransition,
  };
  return platformDepMethodsHolder;
}

} // namespace reanimated
