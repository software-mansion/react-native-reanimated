#import <React/RCTBridge+Private.h>
#import <React/RCTScheduler.h>
#import <React/RCTSurfacePresenter.h>

#import <RNReanimated/NativeProxy.h>
#import <RNReanimated/NewestShadowNodesRegistry.h>
#import <RNReanimated/REAModule.h>
#import <RNReanimated/REANodesManager.h>
#import <RNReanimated/ReanimatedUIManagerBinding.h>
#import <React/RCTFabricSurface.h>
#import <React/RCTSurfacePresenterBridgeAdapter.h>
#include <react/renderer/uimanager/UIManagerCommitHook.h>

using namespace facebook::react;
using namespace reanimated;

struct Link {
  facebook::react::SurfaceHandler::Status status{facebook::react::SurfaceHandler::Status::Unregistered};
  UIManager *uiManager{};
  ShadowTree const *shadowTree{};
};

struct SurfaceHandlerPublic {
  void *vtable;
  butter::shared_mutex linkMutex;
  mutable Link link;
};

@interface ReaRCTFabricSurface : RCTFabricSurface
@property REAModule *reaModule;
@end

@implementation ReaRCTFabricSurface {
  std::shared_ptr<facebook::react::SurfaceHandler> tmp;
  std::shared_ptr<UIManager> uiManager;
}

- (instancetype)init
{
  if (self = [super init]) {
    tmp = std::make_shared<facebook::react::SurfaceHandler>("mleko", 0);
  }
  return self;
}

- (NSNumber *)rootViewTag
{
  return @(5);
}

- (NSInteger)rootTag
{
  return (NSInteger)(@0);
}

- (void)start
{
  //  UIManager* uiManagerPtr = reinterpret_cast<SurfaceHandlerPublic *>(tmp.get())->link.uiManager;
  //  std::shared_ptr<UIManager> uiManagerLocal;
  ////  uiManager = std::shared_ptr<UIManager>();
  //  uiManagerLocal.reset(uiManagerPtr);
  [_reaModule installReanimatedModuleHostObjectJS];
}

- (facebook::react::SurfaceHandler const &)surfaceHandler
{
  return *tmp.get();
}

- (void)setMinimumSize:(CGSize)minimumSize maximumSize:(CGSize)maximumSize
{
}

- (void)setMinimumSize:(CGSize)minimumSize maximumSize:(CGSize)maximumSize viewportOffset:(CGPoint)viewportOffset
{
}

- (CGSize)sizeThatFitsMinimumSize:(CGSize)minimumSize maximumSize:(CGSize)maximumSize
{
  return minimumSize;
}

- (void)stop
{
}

- (nonnull RCTSurfaceView *)view
{
  return nil;
}

@synthesize delegate;

@synthesize intrinsicSize;

@synthesize moduleName;

@synthesize properties;

@synthesize stage;

@end

@interface ReaRCTSurfacePresenter : RCTSurfacePresenter
- (BOOL)resume;
@end

@implementation ReaRCTSurfacePresenter

- (BOOL)resume
{
  BOOL superResume = [super resume];
  return superResume;
}

@end

@interface RCTBridge (JSIRuntime)
- (void *)runtime;
@end

@interface RCTBridge (RCTTurboModule)
- (std::shared_ptr<facebook::react::CallInvoker>)jsCallInvoker;
- (void)_tryAndHandleError:(dispatch_block_t)block;
@end

typedef void (^AnimatedOperation)(REANodesManager *nodesManager);

static __strong ReaRCTFabricSurface *reaSurface;

@implementation REAModule {
  NSMutableArray<AnimatedOperation> *_operations;
  __weak RCTSurfacePresenter *_surfacePresenter;
  std::shared_ptr<NewestShadowNodesRegistry> newestShadowNodesRegistry_;
  std::weak_ptr<NativeReanimatedModule> reanimatedModule_;
  std::weak_ptr<REAModule> reaModule_;
}

RCT_EXPORT_MODULE(ReanimatedModule);

- (void)invalidate
{
  [_surfacePresenter removeObserver:self];
  [[NSNotificationCenter defaultCenter] removeObserver:self];
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

//+ (BOOL)requiresMainQueueSetup
//{
//  return true;
//}

- (void)installReanimatedModuleHostObject
{
  newestShadowNodesRegistry_ = getNewestShadowNodesRegistry();

  RCTCxxBridge *cxxBridge = (RCTCxxBridge *)self.bridge;
  if (!cxxBridge.runtime) {
    return;
  }
  jsi::Runtime &runtime = *(jsi::Runtime *)cxxBridge.runtime;

  RCTScheduler *scheduler = [_surfacePresenter scheduler];
  std::shared_ptr<UIManager> uiManager = scheduler.uiManager;

  if (auto reanimatedModule = reanimatedModule_.lock()) {
    reanimatedModule->setUIManager(scheduler.uiManager);
  }

  RuntimeExecutor syncRuntimeExecutor = [&](std::function<void(jsi::Runtime & runtime_)> &&callback) {
    callback(runtime);
  };
  ReanimatedUIManagerBinding::createAndInstallIfNeeded(
      runtime, syncRuntimeExecutor, uiManager, newestShadowNodesRegistry_);
}

- (void)installReanimatedModuleHostObjectJS
{
  __weak __typeof__(self) weakSelf = self;
  _surfacePresenter = self.bridge.surfacePresenter;
  [_surfacePresenter addObserver:self];
  [_nodesManager setSurfacePresenter:_surfacePresenter];

  RCTRuntimeExecutorFromBridge(self.bridge)(^(jsi::Runtime &runtime) {
    if (__typeof__(self) strongSelf = weakSelf) {
      RCTScheduler *scheduler = [strongSelf->_surfacePresenter scheduler];
      react_native_assert(scheduler != nil);
      std::shared_ptr<UIManager> uiManager = scheduler.uiManager;

      if (auto reanimatedModule = strongSelf->reanimatedModule_.lock()) {
        reanimatedModule->setUIManager(scheduler.uiManager);
      }

      RuntimeExecutor syncRuntimeExecutor = [&](std::function<void(jsi::Runtime & runtime_)> &&callback) {
        callback(runtime);
      };
      ReanimatedUIManagerBinding::createAndInstallIfNeeded(
          runtime, syncRuntimeExecutor, uiManager, self->newestShadowNodesRegistry_);
    }
  });
}

#pragma mark-- Initialize

- (void)setBridge:(RCTBridge *)bridge
{
  [super setBridge:bridge];

  if (self.bridge) {
    _surfacePresenter = self.bridge.surfacePresenter;
    [_surfacePresenter addObserver:self];
    if (reaSurface == nil) {
      reaSurface = [[ReaRCTFabricSurface alloc] init];
      [_surfacePresenter registerSurface:reaSurface];
    }
  }
  reaSurface.reaModule = self;
  [self installReanimatedModuleHostObject];
  _operations = [NSMutableArray new];
  _nodesManager = [[REANodesManager alloc] initWithModule:self bridge:self.bridge surfacePresenter:_surfacePresenter];
  [[self.moduleRegistry moduleForName:"EventDispatcher"] addDispatchObserver:self];
  [bridge.uiManager.observerCoordinator addObserver:self];
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(installTurboModule)
{
  facebook::jsi::Runtime *jsiRuntime = [self.bridge respondsToSelector:@selector(runtime)]
      ? reinterpret_cast<facebook::jsi::Runtime *>(self.bridge.runtime)
      : nullptr;

  if (jsiRuntime) {
    // Reanimated
    auto reanimatedModule = reanimated::createReanimatedModule(self.bridge, self.bridge.jsCallInvoker);
    jsiRuntime->global().setProperty(
        *jsiRuntime,
        "_WORKLET_RUNTIME",
        static_cast<double>(reinterpret_cast<std::uintptr_t>(reanimatedModule->runtime.get())));

    jsiRuntime->global().setProperty(
        *jsiRuntime,
        jsi::PropNameID::forAscii(*jsiRuntime, "__reanimatedModuleProxy"),
        jsi::Object::createFromHostObject(*jsiRuntime, reanimatedModule));
    reanimatedModule_ = reanimatedModule;

    RCTScheduler *scheduler = [_surfacePresenter scheduler];
    if (scheduler != nil) { // first load, on reload scheduler will be null
      reanimatedModule->setUIManager(scheduler.uiManager);
    }
  }
  return nil;
}

#pragma mark-- Transitioning API

RCT_EXPORT_METHOD(triggerRender)
{
  [self addOperationBlock:^(REANodesManager *nodesManager) {
    [nodesManager postRunUpdatesAfterAnimation];
  }];
}

#pragma mark-- Batch handling

- (void)addOperationBlock:(AnimatedOperation)operation
{
  [_operations addObject:operation];
}

#pragma mark - RCTSurfacePresenterObserver

- (void)willMountComponentsWithRootTag:(NSInteger)rootTag
{
  RCTAssertMainQueue();

  RCTExecuteOnUIManagerQueue(^{
    if (_operations.count == 0) {
      return;
    }
    NSArray<AnimatedOperation> *operations = _operations;
    _operations = [NSMutableArray new];
    REANodesManager *nodesManager = _nodesManager;

    RCTExecuteOnMainQueue(^{
      for (AnimatedOperation operation in operations) {
        operation(nodesManager);
      }
      [nodesManager operationsBatchDidComplete];
    });
  });
}

RCT_EXPORT_METHOD(setValue : (nonnull NSNumber *)nodeID newValue : (nonnull NSNumber *)newValue)
{
  [self addOperationBlock:^(REANodesManager *nodesManager) {
    [nodesManager setValueForNodeID:nodeID value:newValue];
  }];
}

- (void)didMountComponentsWithRootTag:(NSInteger)rootTag
{
  RCTAssertMainQueue();
  RCTExecuteOnUIManagerQueue(^{
    /*NSArray<AnimatedOperation> *operations = self->_operations;
    self->_operations = [NSMutableArray new];*/

    RCTExecuteOnMainQueue(^{
        /*for (AnimatedOperation operation in operations) {
          operation(self->_nodesManager);
        }*/
    });
  });
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

@end
