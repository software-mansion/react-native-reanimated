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
  NSMutableDictionary<NSNumber *, NSNumber *> *_subviewIndexByContainerTag;
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
    _subviewIndexByContainerTag = [NSMutableDictionary new];
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

  RCTComponentViewRegistry *componentViewRegistry = _surfacePresenter.mountingManager.componentViewRegistry;

  // Restore order must produce the exact surface-root.subviews ordering RN
  // expects when it processes the Remove mutations: each container must occupy
  // the index it had when we reparented it out. To achieve that, sort by the
  // stashed original index ascending and use insertSubview:atIndex: so each
  // insertion lands at its true target slot (earlier inserts at lower indices
  // don't shift later ones up).
  NSArray<NSNumber *> *sortedTags = [_pendingRestoreContainerTags
      sortedArrayUsingComparator:^NSComparisonResult(NSNumber *a, NSNumber *b) {
        NSNumber *ia = _subviewIndexByContainerTag[a];
        NSNumber *ib = _subviewIndexByContainerTag[b];
        NSUInteger va = ia != nil ? ia.unsignedIntegerValue : NSUIntegerMax;
        NSUInteger vb = ib != nil ? ib.unsignedIntegerValue : NSUIntegerMax;
        if (va < vb) return NSOrderedAscending;
        if (va > vb) return NSOrderedDescending;
        return NSOrderedSame;
      }];

  for (NSNumber *tag in sortedTags) {
    UIView *container = [componentViewRegistry findComponentViewWithTag:static_cast<Tag>(tag.integerValue)];
    UIView *surfaceRoot = _surfaceRootByContainerTag[tag];
    NSNumber *originalIndex = _subviewIndexByContainerTag[tag];
    [_surfaceRootByContainerTag removeObjectForKey:tag];
    [_subviewIndexByContainerTag removeObjectForKey:tag];

    if (container == nil || surfaceRoot == nil) {
      NSLog(@"@@@ restore: tag=%@ container=%@ surfaceRoot=%@, skipping", tag, container, surfaceRoot);
      continue;
    }

    container.layer.transform = CATransform3DIdentity;
    container.userInteractionEnabled = YES;
    NSUInteger insertIndex = originalIndex != nil ? originalIndex.unsignedIntegerValue : surfaceRoot.subviews.count;
    if (insertIndex > surfaceRoot.subviews.count) {
      insertIndex = surfaceRoot.subviews.count;
    }
    [surfaceRoot insertSubview:container atIndex:insertIndex];
    NSLog(@"@@@ restore: tag=%@ moved back to surface root at index=%lu", tag, (unsigned long)insertIndex);
  }

  [_pendingRestoreContainerTags removeAllObjects];
}

- (UIWindow *)overlayWindowForScene:(UIWindowScene *)scene
{
  if (_overlayWindow == nil && scene != nil) {
    _overlayWindow = [[UIWindow alloc] initWithWindowScene:scene];
    _overlayWindow.windowLevel = UIWindowLevelAlert + 1;
    _overlayWindow.backgroundColor = [UIColor clearColor];
    _overlayWindow.userInteractionEnabled = NO;
    _overlayWindow.rootViewController = [UIViewController new];
    _overlayWindow.hidden = NO;
  }
  return _overlayWindow;
}

- (void)didMountComponentsWithRootTag:(NSInteger)rootTag
{
  if (_pendingReparentContainerTags.count == 0) {
    return;
  }
  NSLog(@"@@@ didMountComponentsWithRootTag:%ld pending reparent tags=%@", (long)rootTag, _pendingReparentContainerTags);

  RCTComponentViewRegistry *componentViewRegistry = _surfacePresenter.mountingManager.componentViewRegistry;

  // First pass: capture the original subview index for each container BEFORE
  // any reparenting, because removing a view from its superview compacts the
  // remaining indices and we'd record wrong values for later iterations.
  NSMutableDictionary<NSNumber *, UIView *> *containerByTag = [NSMutableDictionary new];
  for (NSNumber *tag in _pendingReparentContainerTags) {
    UIView *container = [componentViewRegistry findComponentViewWithTag:static_cast<Tag>(tag.integerValue)];
    if (container == nil) {
      NSLog(@"@@@ reparent: container tag=%@ not found in registry, skipping", tag);
      continue;
    }
    UIView *surfaceRoot = container.superview;
    if (surfaceRoot == nil) {
      NSLog(@"@@@ reparent: container tag=%@ has no superview, skipping", tag);
      continue;
    }
    NSUInteger originalIndex = [surfaceRoot.subviews indexOfObject:container];
    _surfaceRootByContainerTag[tag] = surfaceRoot;
    _subviewIndexByContainerTag[tag] = @(originalIndex);
    containerByTag[tag] = container;
    NSLog(@"@@@ reparent: tag=%@ captured originalIndex=%lu", tag, (unsigned long)originalIndex);
  }

  // Second pass: actually reparent.
  for (NSNumber *tag in _pendingReparentContainerTags) {
    UIView *container = containerByTag[tag];
    UIView *surfaceRoot = _surfaceRootByContainerTag[tag];
    if (container == nil || surfaceRoot == nil) {
      continue;
    }
    UIWindow *surfaceWindow = surfaceRoot.window;
    if (surfaceWindow == nil) {
      NSLog(@"@@@ reparent: container tag=%@ surface has no window, skipping", tag);
      continue;
    }
    UIWindow *overlay = [self overlayWindowForScene:surfaceWindow.windowScene];
    if (overlay == nil) {
      NSLog(@"@@@ reparent: container tag=%@ no overlay window, skipping", tag);
      continue;
    }

    CGPoint surfaceOriginInOverlay = [surfaceRoot convertPoint:CGPointZero toView:overlay];
    CGPoint surfaceOriginInItsWindow = [surfaceRoot convertPoint:CGPointZero toView:surfaceWindow];
    CGRect surfaceFrameInScreen = [surfaceRoot.window convertRect:surfaceRoot.bounds fromView:surfaceRoot];
    NSLog(
        @"@@@ reparent: tag=%@ surfaceOriginInOverlay=(%.1f,%.1f) surfaceOriginInItsWindow=(%.1f,%.1f) surfaceFrameInScreen=%@ surfaceWindow=%@ overlay=%@",
        tag,
        surfaceOriginInOverlay.x,
        surfaceOriginInOverlay.y,
        surfaceOriginInItsWindow.x,
        surfaceOriginInItsWindow.y,
        NSStringFromCGRect(surfaceFrameInScreen),
        surfaceWindow,
        overlay);
    NSLog(
        @"@@@ reparent: tag=%@ container.frame=%@ in surfaceRoot.bounds=%@",
        tag,
        NSStringFromCGRect(container.frame),
        NSStringFromCGRect(surfaceRoot.bounds));
    [overlay addSubview:container];
    container.layer.transform = CATransform3DMakeTranslation(surfaceOriginInOverlay.x, surfaceOriginInOverlay.y, 0);
    container.userInteractionEnabled = NO;
    NSLog(@"@@@ reparent: tag=%@ post-reparent container.frame=%@", tag, NSStringFromCGRect(container.frame));
  }

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
