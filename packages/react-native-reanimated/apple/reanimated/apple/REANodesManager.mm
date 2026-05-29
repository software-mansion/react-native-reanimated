#import <reanimated/Tools/FeatureFlags.h>
#import <reanimated/apple/REAAssertJavaScriptQueue.h>
#import <reanimated/apple/REAAssertTurboModuleManagerQueue.h>
#import <reanimated/apple/REANodesManager.h>
#import <reanimated/apple/REAUIView.h>

#import <React/RCTComponentViewProtocol.h>
#import <React/RCTComponentViewRegistry.h>
#import <React/RCTMountingManager.h>
#import <React/RCTSurfacePresenter.h>
#import <React/RCTSurfacePresenterStub.h>
#import <React/RCTUtils.h>

using namespace facebook::react;

@interface REANodesManager () <RCTSurfacePresenterObserver>
@end

@implementation REANodesManager {
  READisplayLink *_displayLink;
  NSMutableArray<REAOnAnimationCallback> *_onAnimationCallbacks;
  REAEventHandler _eventHandler;
  REAPerformOperations _performOperations;
  NSMutableArray<NSNumber *> *_pendingReparentContainerTags;
  NSMutableArray<NSNumber *> *_pendingRestoreContainerTags;
  NSMutableDictionary<NSNumber *, UIView *> *_surfaceRootByContainerTag;
  UIView *_debugRedRectangle;
  UIWindow *_overlayWindow;
}

- (READisplayLink *)getDisplayLink
{
  RCTAssertMainQueue();

  if (!_displayLink) {
    _displayLink = [READisplayLink displayLinkWithTarget:self selector:@selector(onAnimationFrame:)];
#if !TARGET_OS_OSX
    _displayLink.preferredFramesPerSecond = 120; // will fallback to 60 fps for devices without Pro Motion display
#endif // TARGET_OS_OSX
    [_displayLink addToRunLoop:[NSRunLoop mainRunLoop] forMode:NSRunLoopCommonModes];
  }
  return _displayLink;
}

- (void)useDisplayLinkOnMainQueue:(CADisplayLinkOperation)displayLinkOperation
{
  // This method is called on the JavaScript queue during initialization or on the ShadowQueue during invalidation.
  react_native_assert(REAIsJavaScriptQueue() || REAIsTurboModuleManagerQueue());

  __weak __typeof__(self) weakSelf = self;
  RCTExecuteOnMainQueue(^{
    __typeof__(self) strongSelf = weakSelf;
    if (strongSelf == nil) {
      return;
    }
    displayLinkOperation([strongSelf getDisplayLink]);
  });
}

- (nonnull instancetype)init
{
  REAAssertJavaScriptQueue();

  if ((self = [super init])) {
    _onAnimationCallbacks = [NSMutableArray new];
    _pendingReparentContainerTags = [NSMutableArray new];
    _pendingRestoreContainerTags = [NSMutableArray new];
    _surfaceRootByContainerTag = [NSMutableDictionary new];
    _eventHandler = ^(id<RCTEvent> event) {
      // no-op
    };
  }
  [self useDisplayLinkOnMainQueue:^(READisplayLink *displayLink) { [displayLink setPaused:YES]; }];

  return self;
}

- (void)invalidate
{
  REAAssertTurboModuleManagerQueue();

  _eventHandler = nil;
  [self useDisplayLinkOnMainQueue:^(READisplayLink *displayLink) { [displayLink invalidate]; }];
}

- (void)postOnAnimation:(REAOnAnimationCallback)clb
{
  RCTAssertMainQueue();
  [_onAnimationCallbacks addObject:clb];
  [self startUpdatingOnAnimationFrame];
}

- (void)registerEventHandler:(REAEventHandler)eventHandler
{
  REAAssertJavaScriptQueue();
  _eventHandler = eventHandler;
}

- (void)registerPerformOperations:(REAPerformOperations)performOperations
{
  REAAssertJavaScriptQueue();
  _performOperations = performOperations;
}

- (void)startUpdatingOnAnimationFrame
{
  RCTAssertMainQueue();
  [[self getDisplayLink] setPaused:NO];
}

- (void)stopUpdatingOnAnimationFrame
{
  RCTAssertMainQueue();
  [[self getDisplayLink] setPaused:YES];
}

- (void)onAnimationFrame:(READisplayLink *)displayLink
{
  RCTAssertMainQueue();

  NSArray<REAOnAnimationCallback> *callbacks = _onAnimationCallbacks;
  _onAnimationCallbacks = [NSMutableArray new];

  // When one of the callbacks would postOnAnimation callback we don't want
  // to process it until the next frame. This is why we cpy the array before
  // we iterate over it
  for (REAOnAnimationCallback block in callbacks) {
    block(displayLink);
  }

  [self performOperations];

  if (_onAnimationCallbacks.count == 0) {
    [self stopUpdatingOnAnimationFrame];
  }
}

- (void)performOperations
{
  RCTAssertMainQueue();
  _performOperations(); // calls ReanimatedModuleProxy::performOperations
}

- (void)dispatchEvent:(id<RCTEvent>)event
{
  RCTAssertMainQueue();
  __weak REAEventHandler eventHandler = _eventHandler;
  __weak __typeof__(self) weakSelf = self;
  RCTExecuteOnMainQueue(^void() {
    __typeof__(self) strongSelf = weakSelf;
    if (strongSelf == nil) {
      return;
    }
    if (eventHandler == nil) {
      return;
    }
    eventHandler(event);
    if constexpr (reanimated::StaticFeatureFlags::getFlag("USE_ANIMATION_BACKEND")) {
      // Flush already ran inside ReanimatedModuleProxy::handleEventAndFlush (see ReanimatedModule).
    } else {
      [strongSelf performOperations];
    }
  });
}

- (void)maybeFlushUIUpdatesQueue
{
  RCTAssertMainQueue();
  if ([[self getDisplayLink] isPaused]) {
    [self performOperations];
  }
}

- (void)setSurfacePresenter:(RCTSurfacePresenter *)surfacePresenter
{
  if (_surfacePresenter == surfacePresenter) {
    return;
  }
  [_surfacePresenter removeObserver:self];
  _surfacePresenter = surfacePresenter;
  [_surfacePresenter addObserver:self];
}

- (void)queueSharedTransitionContainersForReparenting:(NSArray<NSNumber *> *)containerTags
{
  // Called from C++ at the end of pullTransaction. The UIViews don't exist yet —
  // queue tags and process them once the mounting transaction has been applied.
  [_pendingReparentContainerTags addObjectsFromArray:containerTags];
  NSLog(@"@@@ queued reparent for tags: %@ (pending=%lu)", containerTags, (unsigned long)_pendingReparentContainerTags.count);
}

- (void)queueSharedTransitionContainersForRestoring:(NSArray<NSNumber *> *)containerTags
{
  // Called from C++ at the end of pullTransaction. The Remove/Delete mutations
  // for these tags are in the same transaction that's about to be mounted, so we
  // must restore the original parent BEFORE the mount runs (in willMount).
  [_pendingRestoreContainerTags addObjectsFromArray:containerTags];
  NSLog(@"@@@ queued restore for tags: %@ (pending=%lu)", containerTags, (unsigned long)_pendingRestoreContainerTags.count);
}

#pragma mark - RCTSurfacePresenterObserver

- (void)willMountComponentsWithRootTag:(NSInteger)rootTag
{
  if (_pendingRestoreContainerTags.count == 0) {
    return;
  }
  NSLog(@"@@@ willMountComponentsWithRootTag:%ld pending restore tags=%@", (long)rootTag, _pendingRestoreContainerTags);

  // Real restore disabled while debugging. Just remove the debug red rectangle
  // to confirm the cleanup path fires.
  if (_debugRedRectangle != nil) {
    [_debugRedRectangle removeFromSuperview];
    _debugRedRectangle = nil;
    NSLog(@"@@@ debug: removed red rectangle");
  }

  // RCTComponentViewRegistry *componentViewRegistry = _surfacePresenter.mountingManager.componentViewRegistry;
  //
  // for (NSNumber *tag in _pendingRestoreContainerTags) {
  //   UIView *container = [componentViewRegistry findComponentViewWithTag:static_cast<Tag>(tag.integerValue)];
  //   UIView *surfaceRoot = _surfaceRootByContainerTag[tag];
  //   [_surfaceRootByContainerTag removeObjectForKey:tag];
  //
  //   if (container == nil || surfaceRoot == nil) {
  //     NSLog(@"@@@ restore: tag=%@ container=%@ surfaceRoot=%@, skipping", tag, container, surfaceRoot);
  //     continue;
  //   }
  //
  //   // Reverse the compensating transform and move back so RN's Remove/Delete
  //   // mutations (about to be processed) find the view under the surface root.
  //   container.layer.transform = CATransform3DIdentity;
  //   container.userInteractionEnabled = YES;
  //   [surfaceRoot addSubview:container];
  //   NSLog(@"@@@ restore: tag=%@ moved back to surface root", tag);
  // }

  [_pendingRestoreContainerTags removeAllObjects];
}

- (void)didMountComponentsWithRootTag:(NSInteger)rootTag
{
  if (_pendingReparentContainerTags.count == 0) {
    return;
  }
  NSLog(@"@@@ didMountComponentsWithRootTag:%ld pending reparent tags=%@", (long)rootTag, _pendingReparentContainerTags);

  // Real reparent disabled while debugging. Drop a red rectangle on the window
  // so we can visually confirm something gets layered above the modal.
  UIWindowScene *targetScene = nil;
  for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
    if ([scene isKindOfClass:[UIWindowScene class]] && scene.activationState == UISceneActivationStateForegroundActive) {
      targetScene = (UIWindowScene *)scene;
      break;
    }
  }
  if (targetScene == nil) {
    NSLog(@"@@@ debug: no foreground active window scene");
    [_pendingReparentContainerTags removeAllObjects];
    return;
  }
  if (_overlayWindow == nil) {
    _overlayWindow = [[UIWindow alloc] initWithWindowScene:targetScene];
    _overlayWindow.windowLevel = UIWindowLevelAlert + 1;
    _overlayWindow.backgroundColor = [UIColor clearColor];
    _overlayWindow.userInteractionEnabled = NO;
    _overlayWindow.rootViewController = [UIViewController new];
    _overlayWindow.hidden = NO;
    NSLog(@"@@@ debug: created overlay window level=%.1f frame=%@", _overlayWindow.windowLevel, NSStringFromCGRect(_overlayWindow.frame));
  }
  if (_debugRedRectangle == nil) {
    _debugRedRectangle = [[UIView alloc] initWithFrame:CGRectMake(40, 100, 120, 120)];
    _debugRedRectangle.backgroundColor = [UIColor redColor];
    _debugRedRectangle.userInteractionEnabled = NO;
  }
  [_overlayWindow addSubview:_debugRedRectangle];
  NSLog(@"@@@ debug: added red rectangle to overlay window subviews=%@", _overlayWindow.subviews);

  // RCTComponentViewRegistry *componentViewRegistry = _surfacePresenter.mountingManager.componentViewRegistry;
  //
  // for (NSNumber *tag in _pendingReparentContainerTags) {
  //   UIView *container = [componentViewRegistry findComponentViewWithTag:static_cast<Tag>(tag.integerValue)];
  //   if (container == nil) {
  //     NSLog(@"@@@ reparent: container tag=%@ not found in registry, skipping", tag);
  //     continue;
  //   }
  //   UIView *surfaceRoot = container.superview;
  //   UIWindow *windowForContainer = surfaceRoot.window;
  //   if (surfaceRoot == nil || windowForContainer == nil) {
  //     NSLog(@"@@@ reparent: container tag=%@ has no window (superview=%@, window=%@), skipping", tag, surfaceRoot, windowForContainer);
  //     continue;
  //   }
  //
  //   CGPoint surfaceOriginInWindow = [surfaceRoot convertPoint:CGPointZero toView:windowForContainer];
  //   NSLog(
  //       @"@@@ reparent: tag=%@ moving to window; surfaceOriginInWindow=(%.1f,%.1f)",
  //       tag,
  //       surfaceOriginInWindow.x,
  //       surfaceOriginInWindow.y);
  //   _surfaceRootByContainerTag[tag] = surfaceRoot;
  //   [windowForContainer addSubview:container];
  //   container.layer.transform = CATransform3DMakeTranslation(surfaceOriginInWindow.x, surfaceOriginInWindow.y, 0);
  //   container.userInteractionEnabled = NO;
  // }

  [_pendingReparentContainerTags removeAllObjects];
}

- (void)synchronouslyUpdateUIProps:(ReactTag)viewTag props:(const folly::dynamic &)props
{
  RCTAssertMainQueue();

  RCTSurfacePresenter *surfacePresenter = self.surfacePresenter;
  RCTComponentViewRegistry *componentViewRegistry = surfacePresenter.mountingManager.componentViewRegistry;
  REAUIView<RCTComponentViewProtocol> *componentView =
      [componentViewRegistry findComponentViewWithTag:static_cast<Tag>(viewTag)];
  NSSet<NSString *> *propKeysManagedByAnimated = [componentView propKeysManagedByAnimated_DO_NOT_USE_THIS_IS_BROKEN];
  [surfacePresenter schedulerDidSynchronouslyUpdateViewOnUIThread:viewTag props:props];
  [componentView setPropKeysManagedByAnimated_DO_NOT_USE_THIS_IS_BROKEN:propKeysManagedByAnimated];
  // `synchronouslyUpdateViewOnUIThread` does not flush props like `backgroundColor` etc.
  // so that's why we need to call `finalizeUpdates` here.
  [componentView finalizeUpdates:RNComponentViewUpdateMask{}];
}

@end
