#import <React/RCTBridge+Private.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <React/RCTFabricSurface.h>
#import <React/RCTRuntimeExecutorFromBridge.h>
#import <React/RCTScheduler.h>
#import <React/RCTSurface.h>
#import <React/RCTSurfacePresenter.h>
#import <React/RCTSurfacePresenterBridgeAdapter.h>
#import <React/RCTSurfaceView.h>
#endif

#import <RNReanimated/NativeProxy.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <RNReanimated/REAInitializerRCTFabricSurface.h>
#import <RNReanimated/ReanimatedCommitHook.h>
#endif

#import <RNReanimated/REAModule.h>
#import <RNReanimated/REANodesManager.h>
#import <RNReanimated/REASnapshot.h>
#import <RNReanimated/ReanimatedVersion.h>
#import <RNReanimated/SingleInstanceChecker.h>

using namespace facebook::react;
using namespace reanimated;

@interface RCTBridge (JSIRuntime)
- (void *)runtime;
@end

@interface RCTBridge (RCTTurboModule)
- (std::shared_ptr<facebook::react::CallInvoker>)jsCallInvoker;
- (void)_tryAndHandleError:(dispatch_block_t)block;
@end

#ifdef RCT_NEW_ARCH_ENABLED
static __strong REAInitializerRCTFabricSurface *reaSurface;
#else
typedef void (^AnimatedOperation)(REANodesManager *nodesManager);
#endif

@implementation REAModule {
#ifdef RCT_NEW_ARCH_ENABLED
  __weak RCTSurfacePresenter *_surfacePresenter;
  __weak RCTUIManager *_uiManager; // viewForReactTag
  std::shared_ptr<PropsRegistry> propsRegistry_;
  std::shared_ptr<ReanimatedCommitHook> commitHook_;
  std::weak_ptr<NativeReanimatedModule> weakNativeReanimatedModule_;
#else
  NSMutableArray<AnimatedOperation> *_operations;
#endif
#ifdef DEBUG
  SingleInstanceChecker<REAModule> singleInstanceChecker_;
#endif
  bool hasListeners;
}

RCT_EXPORT_MODULE(ReanimatedModule);

#ifdef RCT_NEW_ARCH_ENABLED
+ (BOOL)requiresMainQueueSetup
{
  return YES;
}
#endif // RCT_NEW_ARCH_ENABLED

- (void)invalidate
{
#ifdef RCT_NEW_ARCH_ENABLED
  [[NSNotificationCenter defaultCenter] removeObserver:self];
  [self.bridge.surfacePresenter removeObserver:self];
#endif
  [_nodesManager invalidate];
  [super invalidate];
}

- (dispatch_queue_t)methodQueue
{
  // This module needs to be on the same queue as the UIManager to avoid
  // having to lock `_operations` and `_preOperations` since `uiManagerWillPerformMounting`
  // will be called from that queue.
  return RCTGetUIManagerQueue();
}

#ifdef RCT_NEW_ARCH_ENABLED

- (std::shared_ptr<UIManager>)getUIManager
{
  RCTScheduler *scheduler = [_surfacePresenter scheduler];
  return scheduler.uiManager;
}

- (void)setUpNativeReanimatedModule:(std::shared_ptr<UIManager>)uiManager
{
  if (auto nativeReanimatedModule = weakNativeReanimatedModule_.lock()) {
    nativeReanimatedModule->setUIManager(uiManager);
    nativeReanimatedModule->setPropsRegistry(propsRegistry_);
  }
}

- (void)injectDependencies:(jsi::Runtime &)runtime
{
  auto uiManager = [self getUIManager];
  react_native_assert(uiManager.get() != nil);
  propsRegistry_ = std::make_shared<PropsRegistry>();
  commitHook_ = std::make_shared<ReanimatedCommitHook>(propsRegistry_, uiManager, weakNativeReanimatedModule_);
  uiManager->registerCommitHook(*commitHook_);
  [self setUpNativeReanimatedModule:uiManager];
}

#pragma mark-- Initialize

- (void)installReanimatedAfterReload
{
  // called from REAInitializerRCTFabricSurface::start
  __weak __typeof__(self) weakSelf = self;
  _surfacePresenter = self.bridge.surfacePresenter;
  [_nodesManager setSurfacePresenter:_surfacePresenter];

  // to avoid deadlock we can't use Executor from React Native
  // but we can create own and use it because initialization is already synchronized
  react_native_assert(self.bridge != nil);
  RCTRuntimeExecutorFromBridge(self.bridge)(^(jsi::Runtime &runtime) {
    if (__typeof__(self) strongSelf = weakSelf) {
      [strongSelf injectDependencies:runtime];
    }
  });
}

- (void)handleJavaScriptDidLoadNotification:(NSNotification *)notification
{
  _surfacePresenter = self.bridge.surfacePresenter;
  RCTScheduler *scheduler = [_surfacePresenter scheduler];
  __weak __typeof__(self) weakSelf = self;
  _surfacePresenter.runtimeExecutor(^(jsi::Runtime &runtime) {
    __typeof__(self) strongSelf = weakSelf;
    if (strongSelf == nil) {
      return;
    }
    if (auto nativeReanimatedModule = strongSelf->weakNativeReanimatedModule_.lock()) {
      auto eventListener =
          std::make_shared<facebook::react::EventListener>([nativeReanimatedModule](const RawEvent &rawEvent) {
            if (!RCTIsMainQueue()) {
              // event listener called on the JS thread, let's ignore this event
              // as we cannot safely access worklet runtime here
              // and also we don't care about topLayout events
              return false;
            }
            return nativeReanimatedModule->handleRawEvent(rawEvent, CACurrentMediaTime() * 1000);
          });
      [scheduler addEventListener:eventListener];
    }
  });
}

- (void)setBridge:(RCTBridge *)bridge
{
  [super setBridge:bridge];

  [[NSNotificationCenter defaultCenter] addObserver:self
                                           selector:@selector(handleJavaScriptDidLoadNotification:)
                                               name:RCTJavaScriptDidLoadNotification
                                             object:nil];

  [[self.moduleRegistry moduleForName:"EventDispatcher"] addDispatchObserver:self];

#ifdef RCT_NEW_ARCH_ENABLED
  [bridge.surfacePresenter addObserver:self];
  _uiManager = bridge.uiManager;
  _animationsManager = [[REAAnimationsManager alloc] initWithUIManager:_uiManager];
#else
  [bridge.uiManager.observerCoordinator addObserver:self];
#endif

  // only within the first loading `self.bridge.surfacePresenter` exists
  // during the reload `self.bridge.surfacePresenter` is null
  _surfacePresenter = self.bridge.surfacePresenter;
#ifdef DEBUG
  if (reaSurface == nil) {
    // we need only one instance because SurfacePresenter is the same during the application lifetime
    reaSurface = [[REAInitializerRCTFabricSurface alloc] init];
    [_surfacePresenter registerSurface:reaSurface];
  }
  reaSurface.reaModule = self;
#endif

  if (_surfacePresenter == nil) {
    // _surfacePresenter will be set in installReanimatedAfterReload
    _nodesManager = [[REANodesManager alloc] initWithModule:self bridge:self.bridge surfacePresenter:nil];
    return;
  }

  _nodesManager = [[REANodesManager alloc] initWithModule:self bridge:self.bridge surfacePresenter:_surfacePresenter];
}

#else

- (void)setBridge:(RCTBridge *)bridge
{
  [super setBridge:bridge];

  _nodesManager = [[REANodesManager alloc] initWithModule:self uiManager:self.bridge.uiManager];
  _operations = [NSMutableArray new];

  [bridge.uiManager.observerCoordinator addObserver:self];
}

#pragma mark-- Batch handling

- (void)addOperationBlock:(AnimatedOperation)operation
{
  [_operations addObject:operation];
}

#pragma mark - RCTUIManagerObserver

- (void)uiManagerWillPerformMounting:(RCTUIManager *)uiManager
{
  [_nodesManager maybeFlushUpdateBuffer];
  if (_operations.count == 0) {
    return;
  }

  NSArray<AnimatedOperation> *operations = _operations;
  _operations = [NSMutableArray new];

  REANodesManager *nodesManager = _nodesManager;

  [uiManager addUIBlock:^(__unused RCTUIManager *manager, __unused NSDictionary<NSNumber *, UIView *> *viewRegistry) {
    for (AnimatedOperation operation in operations) {
      operation(nodesManager);
    }
    [nodesManager operationsBatchDidComplete];
  }];
}

#endif // RCT_NEW_ARCH_ENABLED

#pragma mark-- Events

- (NSArray<NSString *> *)supportedEvents
{
  return @[ @"onReanimatedCall", @"onReanimatedPropsChange" ];
}

- (void)eventDispatcherWillDispatchEvent:(id<RCTEvent>)event
{
  // Events can be dispatched from any queue
  [_nodesManager dispatchEvent:event];
}

- (void)startObserving
{
  hasListeners = YES;
}

- (void)stopObserving
{
  hasListeners = NO;
}

- (void)sendEventWithName:(NSString *)eventName body:(id)body
{
  if (hasListeners) {
    [super sendEventWithName:eventName body:body];
  }
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(installTurboModule)
{
  facebook::jsi::Runtime *jsiRuntime = [self.bridge respondsToSelector:@selector(runtime)]
      ? reinterpret_cast<facebook::jsi::Runtime *>(self.bridge.runtime)
      : nullptr;

  if (jsiRuntime) {
    jsi::Runtime &runtime = *jsiRuntime;

    auto nativeReanimatedModule = reanimated::createReanimatedModule(self.bridge, self.bridge.jsCallInvoker);

    auto workletRuntimeValue = runtime.global()
                                   .getProperty(runtime, "ArrayBuffer")
                                   .asObject(runtime)
                                   .asFunction(runtime)
                                   .callAsConstructor(runtime, {static_cast<double>(sizeof(void *))});
    uintptr_t *workletRuntimeData =
        reinterpret_cast<uintptr_t *>(workletRuntimeValue.getObject(runtime).getArrayBuffer(runtime).data(runtime));
    workletRuntimeData[0] = reinterpret_cast<uintptr_t>(nativeReanimatedModule->runtimeManager_->runtime.get());

    runtime.global().setProperty(runtime, "_WORKLET_RUNTIME", workletRuntimeValue);

    runtime.global().setProperty(runtime, "_WORKLET", false);

#ifdef RCT_NEW_ARCH_ENABLED
    runtime.global().setProperty(runtime, "_IS_FABRIC", true);
#else
    runtime.global().setProperty(runtime, "_IS_FABRIC", false);
#endif // RCT_NEW_ARCH_ENABLED

    auto version = getReanimatedVersionString(runtime);
    runtime.global().setProperty(runtime, "_REANIMATED_VERSION_CPP", version);

    runtime.global().setProperty(
        runtime,
        jsi::PropNameID::forAscii(runtime, "__reanimatedModuleProxy"),
        jsi::Object::createFromHostObject(runtime, nativeReanimatedModule));

#ifdef RCT_NEW_ARCH_ENABLED
    weakNativeReanimatedModule_ = nativeReanimatedModule;
    if (_surfacePresenter != nil) {
      // reload, uiManager is null right now, we need to wait for `installReanimatedAfterReload`
      [self injectDependencies:runtime];
    }
#endif // RCT_NEW_ARCH_ENABLED
  }

  return nil;
}

#pragma mark - RCTSurfacePresenterObserver

#ifdef RCT_NEW_ARCH_ENABLED

static NSMutableDictionary<NSNumber *, REASnapshot *> *beforeSnapshots = nil;
static NSMutableDictionary<NSNumber *, UIView *> *exitingSnapshotViews = nil;

- (void)willMountComponentsWithRootTag:(NSInteger)rootTag
{
  RCTAssertMainQueue();

  if (beforeSnapshots == nil) {
    beforeSnapshots = [[NSMutableDictionary alloc] init];
    exitingSnapshotViews = [[NSMutableDictionary alloc] init];
  }

  [CATransaction begin];
  // this transaction wraps transaction inside RCTPerformMountInstructions
  // because we don't want to splash view for a single frame before entering/layout animations starts

  if (auto nativeReanimatedModule = weakNativeReanimatedModule_.lock()) {
    auto lock = std::lock_guard<std::mutex>(nativeReanimatedModule->tagsMutex_);

    // layout transitions
    for (const auto viewTag : nativeReanimatedModule->tagsOfLayoutViews_) {
      UIView *view = [_uiManager viewForReactTag:@(viewTag)];
      view.reactTag = @(viewTag);
      REASnapshot *snapshot = [[REASnapshot alloc] init:view];
      beforeSnapshots[@(viewTag)] = snapshot;
    }

    // exiting animations
    for (const auto viewTag : nativeReanimatedModule->tagsOfExitingViews_) {
      UIView *view = [_uiManager viewForReactTag:@(viewTag)];
      REASnapshot *snapshot = [[REASnapshot alloc] initWithAbsolutePosition:view];
      UIView *snapshotView = [view snapshotViewAfterScreenUpdates:NO];
      CGFloat x = [snapshot.values[@"originX"] floatValue];
      CGFloat y = [snapshot.values[@"originY"] floatValue];
      CGFloat width = [snapshot.values[@"width"] floatValue];
      CGFloat height = [snapshot.values[@"height"] floatValue];
      snapshotView.frame = CGRectMake(x, y, width, height);
      snapshotView.reactTag = @(viewTag);
      exitingSnapshotViews[@(viewTag)] = snapshotView;
    }
  }
}

- (void)didMountComponentsWithRootTag:(NSInteger)rootTag
{
  RCTAssertMainQueue();

  if (auto nativeReanimatedModule = weakNativeReanimatedModule_.lock()) {
    auto lock = std::lock_guard<std::mutex>(nativeReanimatedModule->tagsMutex_);
    // TODO: ensure vectors are the same as in willMountComponentsWithRootTag

    // entering animations
    for (const auto viewTag : nativeReanimatedModule->tagsOfEnteringViews_) {
      UIView *view = [_uiManager viewForReactTag:@(viewTag)];
      REASnapshot *afterSnapshot = [[REASnapshot alloc] init:view];
      view.reactTag = @(viewTag);
      [_animationsManager onViewCreate:view after:afterSnapshot];
    }
    nativeReanimatedModule->tagsOfEnteringViews_.clear();

    // layout transitions
    for (const auto viewTag : nativeReanimatedModule->tagsOfLayoutViews_) {
      UIView *view = [_uiManager viewForReactTag:@(viewTag)];
      REASnapshot *afterSnapshot = [[REASnapshot alloc] init:view];
      [_animationsManager onViewUpdate:view before:beforeSnapshots[@(viewTag)] after:afterSnapshot];
    }
    nativeReanimatedModule->tagsOfLayoutViews_.clear();

    // exiting animations
    for (const auto viewTag : nativeReanimatedModule->tagsOfExitingViews_) {
      UIView *snapshotView = exitingSnapshotViews[@(viewTag)];
      [exitingSnapshotViews removeObjectForKey:@(viewTag)];
      UIView *windowView = UIApplication.sharedApplication.keyWindow;
      [windowView addSubview:snapshotView];
      [_animationsManager startAnimationsRecursive:snapshotView shouldRemoveSubviewsWithoutAnimations:YES];
    }
    nativeReanimatedModule->tagsOfExitingViews_.clear();
  }

  [CATransaction commit];
}

#endif // RCT_NEW_ARCH_ENABLED

@end
