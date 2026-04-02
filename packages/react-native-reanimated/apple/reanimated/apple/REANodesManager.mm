#import <reanimated/apple/REAAssertJavaScriptQueue.h>
#import <reanimated/apple/REAAssertTurboModuleManagerQueue.h>
#import <reanimated/apple/REANodesManager.h>
#import <reanimated/apple/REAUIView.h>

#import <React/RCTComponentViewProtocol.h>
#import <React/RCTComponentViewRegistry.h>
#import <React/RCTMountingManager.h>
#import <React/RCTMountingManagerDelegate.h>
#import <React/RCTUtils.h>

using namespace facebook::react;

// ---------------------------------------------------------------------------
// REAMountingDelegateProxy
//
// Wraps the existing RCTMountingManagerDelegate (set by RCTSurfacePresenter)
// and adds a hook after each mounting transaction completes. This lets us
// flush pseudo-selector attach requests that were deferred because the native
// view was not yet in RCTComponentViewRegistry when the JS-side
// componentDidMount called registerPseudoStyle.
// ---------------------------------------------------------------------------
@interface REAMountingDelegateProxy : NSObject <RCTMountingManagerDelegate>
@property (nonatomic, weak) id<RCTMountingManagerDelegate> originalDelegate;
@property (nonatomic, copy) void (^onDidMountComponents)(void);
@end

@implementation REAMountingDelegateProxy

- (void)mountingManager:(RCTMountingManager *)mountingManager
    willMountComponentsWithRootTag:(ReactTag)rootTag
{
  [self.originalDelegate mountingManager:mountingManager willMountComponentsWithRootTag:rootTag];
}

- (void)mountingManager:(RCTMountingManager *)mountingManager
    didMountComponentsWithRootTag:(ReactTag)rootTag
{
  [self.originalDelegate mountingManager:mountingManager didMountComponentsWithRootTag:rootTag];
  if (self.onDidMountComponents) {
    self.onDidMountComponents();
  }
}

@end

// ---------------------------------------------------------------------------

@implementation REANodesManager {
  READisplayLink *_displayLink;
  NSMutableArray<REAOnAnimationCallback> *_onAnimationCallbacks;
  REAEventHandler _eventHandler;
  REAPerformOperations _performOperations;

  // Pseudo-selector pending attach map: tag → block to run once the view appears.
  // Populated when attachPseudoSelector is called but findComponentViewWithTag
  // returns nil (view not yet mounted). Flushed after each mounting transaction.
  NSMutableDictionary<NSNumber *, void (^)(REAUIView *)> *_pendingPseudoSelectorAttaches;

  // Retained proxy that wraps the original mounting manager delegate.
  REAMountingDelegateProxy *_mountingDelegateProxy;
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

@synthesize surfacePresenter = _surfacePresenter;

- (void)setSurfacePresenter:(RCTSurfacePresenter *)surfacePresenter
{
  if (!surfacePresenter && _surfacePresenter && _mountingDelegateProxy) {
    // Restore the original delegate on teardown so we don't leave a dangling proxy.
    _surfacePresenter.mountingManager.delegate = _mountingDelegateProxy.originalDelegate;
    _mountingDelegateProxy = nil;
  }
  _surfacePresenter = surfacePresenter;
  if (surfacePresenter) {
    // Install a proxy delegate on the mounting manager so we can flush
    // deferred pseudo-selector attaches after each mounting transaction.
    RCTMountingManager *mountingManager = surfacePresenter.mountingManager;
    _mountingDelegateProxy = [[REAMountingDelegateProxy alloc] init];
    _mountingDelegateProxy.originalDelegate = mountingManager.delegate;
    __weak __typeof__(self) weakSelf = self;
    _mountingDelegateProxy.onDidMountComponents = ^{
      [weakSelf flushPendingPseudoSelectorAttaches];
    };
    mountingManager.delegate = _mountingDelegateProxy;
  }
}

- (nonnull instancetype)init
{
  REAAssertJavaScriptQueue();

  if ((self = [super init])) {
    _onAnimationCallbacks = [NSMutableArray new];
    _pendingPseudoSelectorAttaches = [NSMutableDictionary new];
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
  [_pendingPseudoSelectorAttaches removeAllObjects];
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
    [strongSelf performOperations];
  });
}

- (void)maybeFlushUIUpdatesQueue
{
  RCTAssertMainQueue();
  if ([[self getDisplayLink] isPaused]) {
    [self performOperations];
  }
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

- (void)addPendingPseudoSelectorAttach:(void (^)(REAUIView *))attachBlock forTag:(int)tag
{
  RCTAssertMainQueue();
  _pendingPseudoSelectorAttaches[@(tag)] = [attachBlock copy];
}

- (void)removePendingPseudoSelectorAttach:(int)tag
{
  RCTAssertMainQueue();
  [_pendingPseudoSelectorAttaches removeObjectForKey:@(tag)];
}

- (void)flushPendingPseudoSelectorAttaches
{
  RCTAssertMainQueue();
  if (_pendingPseudoSelectorAttaches.count == 0) {
    return;
  }
  RCTComponentViewRegistry *registry = self.surfacePresenter.mountingManager.componentViewRegistry;
  // Snapshot keys so we can mutate the dict while iterating.
  NSArray<NSNumber *> *tags = [_pendingPseudoSelectorAttaches.allKeys copy];
  for (NSNumber *tagNum in tags) {
    REAUIView *view = [registry findComponentViewWithTag:(Tag)[tagNum intValue]];
    if (view) {
      void (^block)(REAUIView *) = _pendingPseudoSelectorAttaches[tagNum];
      [_pendingPseudoSelectorAttaches removeObjectForKey:tagNum];
      block(view);
    }
  }
}

@end
