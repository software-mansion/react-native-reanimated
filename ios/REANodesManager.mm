#import "REANodesManager.h"

#import <React/RCTConvert.h>
#import <React/RCTFollyConvert.h>

#import <React/RCTShadowView.h>
#import "REAModule.h"

#import <React-Fabric/react/renderer/uimanager/UIManager.h> // UIManager, ReanimatedListener
#import <react/renderer/core/ShadowNode.h> // ShadowNode::Shared, ShadowTreeCommitTransaction

using namespace facebook::react;

// Interface below has been added in order to use private methods of RCTUIManager,
// RCTUIManager#UpdateView is a React Method which is exported to JS but in
// Objective-C it stays private
// RCTUIManager#setNeedsLayout is a method which updated layout only which
// in its turn will trigger relayout if no batch has been activated

@interface RCTUIManager ()

- (void)updateView:(nonnull NSNumber *)reactTag viewName:(NSString *)viewName props:(NSDictionary *)props;

- (void)setNeedsLayout;

@end

@interface RCTUIManager (SyncUpdates)

- (BOOL)hasEnqueuedUICommands;

- (void)runSyncUIUpdatesWithObserver:(id<RCTUIManagerObserver>)observer;

@end

@implementation RCTUIManager (SyncUpdates)

- (BOOL)hasEnqueuedUICommands
{
  // Accessing some private bits of RCTUIManager to provide missing functionality
  return [[self valueForKey:@"_pendingUIBlocks"] count] > 0;
}

- (void)runSyncUIUpdatesWithObserver:(id<RCTUIManagerObserver>)observer
{
  // before we run uimanager batch complete, we override coordinator observers list
  // to avoid observers from firing. This is done because we only want the uimanager
  // related operations to run and not all other operations (including the ones enqueued
  // by reanimated or native animated modules) from being scheduled. If we were to allow
  // other modules to execute some logic from this sync uimanager run there is a possibility
  // that the commands will execute out of order or that we intercept a batch of commands that
  // those modules may be in a middle of (we verify that batch isn't in progress for uimodule
  // but can't do the same for all remaining modules)

  // store reference to the observers array
  id oldObservers = [self.observerCoordinator valueForKey:@"_observers"];

  // temporarily replace observers with a table conatining just nodesmanager (we need
  // this to capture mounting block)
  NSHashTable<id<RCTUIManagerObserver>> *soleObserver = [NSHashTable new];
  [soleObserver addObject:observer];
  [self.observerCoordinator setValue:soleObserver forKey:@"_observers"];

  // run batch
  [self batchDidComplete];
  // restore old observers table
  [self.observerCoordinator setValue:oldObservers forKey:@"_observers"];
}

@end

@interface REANodesManager () <RCTUIManagerObserver>

@end

@implementation REANodesManager {
    __weak RCTBridge *_bridge;
  NSMutableArray<id<RCTEvent>> *_eventQueue;
  CADisplayLink *_displayLink;
  BOOL _wantRunUpdates;
  BOOL _processingDirectEvent;
  NSMutableArray<REAOnAnimationCallback> *_onAnimationCallbacks;
  NSMutableDictionary<NSNumber*, NSMutableDictionary*> *_operationsInBatch;
  BOOL _tryRunBatchUpdatesSynchronously;
  REAEventHandler _eventHandler;
  volatile void (^_mounting)(void);
  __weak id<RCTSurfacePresenterStub> _surfacePresenter;
}

- (nonnull instancetype)initWithModule:(REAModule *)reanimatedModule
                                bridge:(RCTBridge *)bridge
                                surfacePresenter:(id<RCTSurfacePresenterStub>)surfacePresenter
{
  if ((self = [super init])) {
      _bridge = bridge;
    _surfacePresenter = surfacePresenter;
    _reanimatedModule = reanimatedModule;
    _eventQueue = [NSMutableArray new];
    _wantRunUpdates = NO;
    _onAnimationCallbacks = [NSMutableArray new];
    _operationsInBatch = [NSMutableDictionary new];
  }

  _displayLink = [CADisplayLink displayLinkWithTarget:self selector:@selector(onAnimationFrame:)];
  [_displayLink addToRunLoop:[NSRunLoop mainRunLoop] forMode:NSRunLoopCommonModes];
  [_displayLink setPaused:true];
  return self;
}

- (void)invalidate
{
  _eventHandler = nil;
  [self stopUpdatingOnAnimationFrame];
}

- (void)operationsBatchDidComplete
{
  if (![_displayLink isPaused]) {
    // if display link is set it means some of the operations that have run as a part of the batch
    // requested updates. We want updates to be run in the same frame as in which operations have
    // been scheduled as it may mean the new view has just been mounted and expects its initial
    // props to be calculated.
    // Unfortunately if the operation has just scheduled animation callback it won't run until the
    // next frame, so it's being triggered manually.
    _wantRunUpdates = YES;
    [self performOperations];
  }
}

- (void)postOnAnimation:(REAOnAnimationCallback)clb
{
  [_onAnimationCallbacks addObject:clb];
  [self startUpdatingOnAnimationFrame];
}

- (void)postRunUpdatesAfterAnimation
{
  _wantRunUpdates = YES;
  if (!_processingDirectEvent) {
    [self startUpdatingOnAnimationFrame];
  }
}

- (void)registerEventHandler:(REAEventHandler)eventHandler
{
  _eventHandler = eventHandler;
}

- (void)startUpdatingOnAnimationFrame
{
  // Setting _currentAnimationTimestamp here is connected with manual triggering of performOperations
  // in operationsBatchDidComplete. If new node has been created and clock has not been started,
  // _displayLink won't be initialized soon enough and _displayLink.timestamp will be 0.
  // However, CADisplayLink is using CACurrentMediaTime so if there's need to perform one more
  // evaluation, it could be used it here. In usual case, CACurrentMediaTime is not being used in
  // favor of setting it with _displayLink.timestamp in onAnimationFrame method.
  _currentAnimationTimestamp = CACurrentMediaTime();
  [_displayLink setPaused:false];
}

- (void)stopUpdatingOnAnimationFrame
{
  if (_displayLink) {
    [_displayLink setPaused:true];
  }
}

- (void)onAnimationFrame:(CADisplayLink *)displayLink
{
  _currentAnimationTimestamp = _displayLink.timestamp;

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

- (BOOL)uiManager:(RCTUIManager *)manager performMountingWithBlock:(RCTUIManagerMountingBlock)block
{
  RCTAssert(_mounting == nil, @"Mouting block is expected to not be set");
  _mounting = block;
  return YES;
}

- (void)performOperations
{
  if (_operationsInBatch.count != 0) {
    NSMutableDictionary<NSNumber *, NSMutableDictionary *> *copiedOperationsQueue = _operationsInBatch;
    _operationsInBatch = [NSMutableDictionary new];

    // ReanimatedListener::runtimeScheduler->executeNowOnTheSameThread([copiedOperationsQueue](jsi::Runtime &rt) {
    //     jsi::Array arr(rt, [copiedOperationsQueue count]);
        
    //     int i = 0;
    //     for (NSNumber *tag in copiedOperationsQueue.allKeys) {
    //         jsi::Object obj(rt);
    //         obj.setProperty(rt, "tag", jsi::Value(rt, tag.intValue));
    //         jsi::Object diffObject(rt);
    //         NSMutableDictionary *diff = copiedOperationsQueue[tag];
    //         for (NSString *prop in diff.allKeys) {
    //             NSNumber *value = diff[prop];
    //             diffObject.setProperty(rt, prop.UTF8String, jsi::Value(rt, value.intValue));
    //             // TODO: transform
    //         }
    //         obj.setProperty(rt, "diff", diffObject);
    //         arr.setValueAtIndex(rt, i++, obj);
    //     }
        
    //     rt.global().getPropertyAsFunction(rt, "newUpdateProps").call(rt, jsi::Value(rt, arr));
    // });
  }
  _wantRunUpdates = NO;
}

- (void)enqueueUpdateViewOnNativeThread:(nonnull NSNumber *)reactTag
                               viewName:(NSString *)viewName
                            nativeProps:(NSMutableDictionary *)nativeProps
                       trySynchronously:(BOOL)trySync
{
//  if (trySync) {
//    _tryRunBatchUpdatesSynchronously = YES;
//  }
//  [_operationsInBatch addObject:^(RCTUIManager *uiManager) {
//    [uiManager updateView:reactTag viewName:viewName props:nativeProps];
//  }];
}


#pragma mark-- Graph

- (void)processDirectEvent:(id<RCTEvent>)event
{
  _processingDirectEvent = YES;
  [self performOperations];
  _processingDirectEvent = NO;
}

- (BOOL)isDirectEvent:(id<RCTEvent>)event
{
  static NSArray<NSString *> *directEventNames;
  static dispatch_once_t directEventNamesToken;
  dispatch_once(&directEventNamesToken, ^{
    directEventNames = @[
      @"topContentSizeChange",
      @"topMomentumScrollBegin",
      @"topMomentumScrollEnd",
      @"topScroll",
      @"topScrollBeginDrag",
      @"topScrollEndDrag"
    ];
  });

  return [directEventNames containsObject:RCTNormalizeInputEventName(event.eventName)];
}

- (void)dispatchEvent:(id<RCTEvent>)event
{
  NSString *key = [NSString stringWithFormat:@"%@%@", event.viewTag, RCTNormalizeInputEventName(event.eventName)];

  NSString *eventHash = [NSString stringWithFormat:@"%@%@", event.viewTag, event.eventName];

  if (_eventHandler != nil) {
    __weak REAEventHandler eventHandler = _eventHandler;
    __weak typeof(self) weakSelf = self;
    RCTExecuteOnMainQueue(^void() {
      __typeof__(self) strongSelf = weakSelf;
      if (strongSelf == nil) {
        return;
      }
      if (eventHandler == nil) {
        return;
      }
      eventHandler(eventHash, event);
      if ([strongSelf isDirectEvent:event]) {
        [strongSelf performOperations];
      }
    });
  }
}

- (void)configureProps:(NSSet<NSString *> *)nativeProps uiProps:(NSSet<NSString *> *)uiProps
{
  _uiProps = uiProps;
  _nativeProps = nativeProps;
}


- (void)updateProps:(nonnull NSDictionary *)props
      ofViewWithTag:(nonnull NSNumber *)viewTag
           withName:(nonnull NSString *)viewName
     withShadowNode:(nonnull void *)shadowNodePtr
{
  // TODO: refactor PropsNode to also use this function
  NSMutableDictionary *uiProps = [NSMutableDictionary new];
  NSMutableDictionary *nativeProps = [NSMutableDictionary new];
  NSMutableDictionary *jsProps = [NSMutableDictionary new];

  void (^addBlock)(NSString *key, id obj, BOOL *stop) = ^(NSString *key, id obj, BOOL *stop) {
    if ([self.uiProps containsObject:key]) {
      uiProps[key] = obj;
    } else if ([self.nativeProps containsObject:key]) {
      nativeProps[key] = obj;
    } else {
      jsProps[key] = obj;
    }
  };

  [props enumerateKeysAndObjectsUsingBlock:addBlock];

  if (uiProps.count > 0) {
      if (_bridge.surfacePresenter) {
        [_bridge.surfacePresenter synchronouslyUpdateViewOnUIThread:viewTag
        props:uiProps];
      } else {
        [_surfacePresenter synchronouslyUpdateViewOnUIThread:viewTag
        props:uiProps];
      }
    //[self.uiManager synchronouslyUpdateViewOnUIThread:viewTag viewName:viewName props:uiProps];
  }
  if (nativeProps.count > 0) {
      _operationsInBatch[viewTag] = nativeProps;
      
    std::shared_ptr<UIManager> uiManager = ReanimatedListener::uiManager;
    ShadowTreeRegistry *shadowTreeRegistry = ReanimatedListener::shadowTreeRegistry;
    std::shared_ptr<const ContextContainer> contextContainer = uiManager->getContextContainer();

    const ShadowNode *shadowNode = reinterpret_cast<ShadowNode::Shared *>(shadowNodePtr)->get();
    const ShadowNodeFamily &family = shadowNode->getFamily();
    Tag tag = shadowNode->getTag(); // DEPRECATED
    SurfaceId surfaceId = shadowNode->getFamily().getSurfaceId();

    shadowTreeRegistry->visit(surfaceId, [&](ShadowTree const &shadowTree) {
        ShadowTreeCommitTransaction transaction = [&](RootShadowNode const &oldRootShadowNode) {
            std::function<ShadowNode::Unshared(ShadowNode const &oldShadowNode)> callback =
                [&](ShadowNode const &oldShadowNode) {
                    NSMutableDictionary *props = [_operationsInBatch objectForKey:[NSNumber numberWithInt:tag]];
                    folly::dynamic propsDynamic = convertIdToFollyDynamic(props);
                    
                    PropsParserContext propsParserContext{surfaceId, *contextContainer};
                    Props::Shared newProps = oldShadowNode.getComponentDescriptor().cloneProps(
                           propsParserContext,
                           oldShadowNode.getProps(),
                           RawProps(propsDynamic));

                    ShadowNodeFragment fragment{ /* .props = */ newProps };
                    return oldShadowNode.clone(fragment);
                };
            
            ShadowNode::Unshared newRoot = oldRootShadowNode.cloneTree(family, callback);
            return std::static_pointer_cast<RootShadowNode>(newRoot);
        };
        
        ShadowTree::CommitOptions commitOptions{};
        shadowTree.commit(transaction, commitOptions);
    });

    // [self enqueueUpdateViewOnNativeThread:viewTag viewName:viewName nativeProps:nativeProps trySynchronously:YES];
  }
  if (jsProps.count > 0) {
    [self.reanimatedModule sendEventWithName:@"onReanimatedPropsChange"
                                        body:@{@"viewTag" : viewTag, @"props" : jsProps}];
  }
}

- (NSString *)obtainProp:(nonnull NSNumber *)viewTag propName:(nonnull NSString *)propName
{
  UIView *view = [self.uiManager viewForReactTag:viewTag];

  NSString *result =
      [NSString stringWithFormat:@"error: unknown propName %@, currently supported: opacity, zIndex", propName];

  if ([propName isEqualToString:@"opacity"]) {
    CGFloat alpha = view.alpha;
    result = [@(alpha) stringValue];
  } else if ([propName isEqualToString:@"zIndex"]) {
    NSInteger zIndex = view.reactZIndex;
    result = [@(zIndex) stringValue];
  }

  return result;
}

@end
