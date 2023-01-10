#import <RNReanimated/REAModule.h>
#import <RNReanimated/REANodesManager.h>
#import <React/RCTConvert.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <React/RCTComponentViewRegistry.h>
#import <React/RCTMountingManager.h>
#import <React/RCTSurfacePresenter.h>
#import <react/renderer/core/ShadowNode.h>
#import <react/renderer/uimanager/UIManager.h>
#else
#import <stdatomic.h>
#endif

#ifdef RCT_NEW_ARCH_ENABLED
using namespace facebook::react;
#endif

#import <react/RCTComponentData.h>
#import <react/RCTParserUtils.h>
#import <objc/message.h>
typedef void (^RCTPropBlock)(id<RCTComponent> view, id json, NSMutableDictionary<NSString *, id> * snapshotProps);
typedef NSMutableDictionary<NSString *, RCTPropBlock> RCTPropBlockDictionary;

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

@interface ComponentUpdate : NSObject

@property (nonnull) NSMutableDictionary *props;
@property (nonnull) NSNumber *viewTag;
@property (nonnull) NSString *viewName;

@end

@implementation ComponentUpdate
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
  CADisplayLink *_displayLink;
  BOOL _wantRunUpdates;
  NSMutableArray<REAOnAnimationCallback> *_onAnimationCallbacks;
  BOOL _tryRunBatchUpdatesSynchronously;
  REAEventHandler _eventHandler;
  volatile void (^_mounting)(void);
  NSMutableDictionary<NSNumber *, ComponentUpdate *> *_componentUpdateBuffer;
  NSMutableDictionary<NSNumber *, UIView *> *_viewRegistry;
#ifdef RCT_NEW_ARCH_ENABLED
  __weak RCTBridge *_bridge;
  REAPerformOperations _performOperations;
  __weak id<RCTSurfacePresenterStub> _surfacePresenter;
  NSMutableDictionary<NSNumber *, NSMutableDictionary *> *_operationsInBatch;
#else
  NSMutableArray<REANativeAnimationOp> *_operationsInBatch;
  volatile atomic_bool _shouldFlushUpdateBuffer;
#endif
}

#ifdef RCT_NEW_ARCH_ENABLED
- (nonnull instancetype)initWithModule:(REAModule *)reanimatedModule
                                bridge:(RCTBridge *)bridge
                      surfacePresenter:(id<RCTSurfacePresenterStub>)surfacePresenter
{
  if ((self = [super init])) {
    _bridge = bridge;
    _surfacePresenter = surfacePresenter;
    _reanimatedModule = reanimatedModule;
    _wantRunUpdates = NO;
    _onAnimationCallbacks = [NSMutableArray new];
    _operationsInBatch = [NSMutableDictionary new];
    _componentUpdateBuffer = [NSMutableDictionary new];
    _viewRegistry = [_uiManager valueForKey:@"_viewRegistry"];
  }

  _displayLink = [CADisplayLink displayLinkWithTarget:self selector:@selector(onAnimationFrame:)];
  _displayLink.preferredFramesPerSecond = 120; // will fallback to 60 fps for devices without Pro Motion display
  [_displayLink addToRunLoop:[NSRunLoop mainRunLoop] forMode:NSRunLoopCommonModes];
  [_displayLink setPaused:true];
  return self;
}
#else
- (instancetype)initWithModule:(REAModule *)reanimatedModule uiManager:(RCTUIManager *)uiManager
{
  if ((self = [super init])) {
    _reanimatedModule = reanimatedModule;
    _uiManager = uiManager;
    _wantRunUpdates = NO;
    _onAnimationCallbacks = [NSMutableArray new];
    _operationsInBatch = [NSMutableArray new];
    _componentUpdateBuffer = [NSMutableDictionary new];
    _viewRegistry = [_uiManager valueForKey:@"_viewRegistry"];
    _shouldFlushUpdateBuffer = false;
  }

  _displayLink = [CADisplayLink displayLinkWithTarget:self selector:@selector(onAnimationFrame:)];
  _displayLink.preferredFramesPerSecond = 120; // will fallback to 60 fps for devices without Pro Motion display
  [_displayLink addToRunLoop:[NSRunLoop mainRunLoop] forMode:NSRunLoopCommonModes];
  [_displayLink setPaused:true];
  return self;
}
#endif

- (void)invalidate
{
  _eventHandler = nil;
  [_displayLink invalidate];
}

#ifdef RCT_NEW_ARCH_ENABLED
- (void)setSurfacePresenter:(id<RCTSurfacePresenterStub>)surfacePresenter
{
  _surfacePresenter = surfacePresenter;
}
#endif

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

- (void)registerEventHandler:(REAEventHandler)eventHandler
{
  _eventHandler = eventHandler;
}

#ifdef RCT_NEW_ARCH_ENABLED
- (void)registerPerformOperations:(REAPerformOperations)performOperations
{
  _performOperations = performOperations;
}
#endif

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
#ifdef RCT_NEW_ARCH_ENABLED
  _performOperations(); // calls NativeReanimatedModule::performOperations
  _wantRunUpdates = NO;
#else
  if (_operationsInBatch.count != 0) {
    NSMutableArray<REANativeAnimationOp> *copiedOperationsQueue = _operationsInBatch;
    _operationsInBatch = [NSMutableArray new];

    BOOL trySynchronously = _tryRunBatchUpdatesSynchronously;
    _tryRunBatchUpdatesSynchronously = NO;

    __weak __typeof__(self) weakSelf = self;
    dispatch_semaphore_t semaphore = dispatch_semaphore_create(0);
    RCTExecuteOnUIManagerQueue(^{
      __typeof__(self) strongSelf = weakSelf;
      if (strongSelf == nil) {
        return;
      }
      BOOL canUpdateSynchronously = trySynchronously && ![strongSelf.uiManager hasEnqueuedUICommands];

      if (!canUpdateSynchronously) {
        dispatch_semaphore_signal(semaphore);
      }

      for (int i = 0; i < copiedOperationsQueue.count; i++) {
        copiedOperationsQueue[i](strongSelf.uiManager);
      }

      if (canUpdateSynchronously) {
        [strongSelf.uiManager runSyncUIUpdatesWithObserver:self];
        dispatch_semaphore_signal(semaphore);
      }
      // In case canUpdateSynchronously=true we still have to send uiManagerWillPerformMounting event
      // to observers because some components (e.g. TextInput) update their UIViews only on that event.
      [strongSelf.uiManager setNeedsLayout];
    });
    if (trySynchronously) {
      dispatch_semaphore_wait(semaphore, DISPATCH_TIME_FOREVER);
    }

    if (_mounting) {
      _mounting();
      _mounting = nil;
    }
  }
  _wantRunUpdates = NO;
#endif
}

#ifdef RCT_NEW_ARCH_ENABLED
// nothing
#else
- (void)enqueueUpdateViewOnNativeThread:(nonnull NSNumber *)reactTag
                               viewName:(NSString *)viewName
                            nativeProps:(NSMutableDictionary *)nativeProps
                       trySynchronously:(BOOL)trySync
{
  if (trySync) {
    _tryRunBatchUpdatesSynchronously = YES;
  }
  [_operationsInBatch addObject:^(RCTUIManager *uiManager) {
    [uiManager updateView:reactTag viewName:viewName props:nativeProps];
  }];
}
#endif

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
    __weak __typeof__(self) weakSelf = self;
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

#ifdef RCT_NEW_ARCH_ENABLED
// nothing
#else
- (void)configureUiProps:(nonnull NSSet<NSString *> *)uiPropsSet
          andNativeProps:(nonnull NSSet<NSString *> *)nativePropsSet
{
  _uiProps = uiPropsSet;
  _nativeProps = nativePropsSet;
}
#endif

- (BOOL)isNativeViewMounted:(NSNumber *)viewTag
{
  return _viewRegistry[viewTag].superview != nil;
}

#ifdef RCT_NEW_ARCH_ENABLED

- (void)synchronouslyUpdateViewOnUIThread:(nonnull NSNumber *)viewTag props:(nonnull NSDictionary *)uiProps
{
  // adapted from RCTPropsAnimatedNode.m
  RCTSurfacePresenter *surfacePresenter = _bridge.surfacePresenter ?: _surfacePresenter;
  [surfacePresenter synchronouslyUpdateViewOnUIThread:viewTag props:uiProps];

  // `synchronouslyUpdateViewOnUIThread` does not flush props like `backgroundColor` etc.
  // so that's why we need to call `finalizeUpdates` here.
  RCTComponentViewRegistry *componentViewRegistry = surfacePresenter.mountingManager.componentViewRegistry;
  UIView<RCTComponentViewProtocol> *componentView =
      [componentViewRegistry findComponentViewWithTag:[viewTag integerValue]];
  [componentView finalizeUpdates:RNComponentViewUpdateMask{}];
}

#else

- (void)updateProps:(nonnull NSDictionary *)props
      ofViewWithTag:(nonnull NSNumber *)viewTag
           withName:(nonnull NSString *)viewName
{
  ComponentUpdate *lastSnapshot = _componentUpdateBuffer[viewTag];
  BOOL isNativeViewMounted = [self isNativeViewMounted:viewTag];

  if (lastSnapshot != nil) {
    NSMutableDictionary *lastProps = lastSnapshot.props;
    for (NSString *key in props) {
      [lastProps setValue:props[key] forKey:key];
    }
  }

  // If the component isn't mounted, we will bail early with a scheduled update
  if (!isNativeViewMounted) {
    if (lastSnapshot == nil) {
      ComponentUpdate *propsSnapshot = [ComponentUpdate new];
      propsSnapshot.props = [props mutableCopy];
      propsSnapshot.viewTag = viewTag;
      propsSnapshot.viewName = viewName;
      _componentUpdateBuffer[viewTag] = propsSnapshot;
      atomic_store(&_shouldFlushUpdateBuffer, true);
    }

    return;
  }

  // The component may have been mounted with a pending snapshot (due to a race condition),
  // so we should attempt run the update. Otherwise, the next call to -maybeFlushUpdateBuffer
  // will only arrive when a new component is mounted (which might be never!)
  //
  // If there are 0 remaining items in the buffer, we can skip the run in -maybeFlushUpdateBuffer.
  if (lastSnapshot != nil && isNativeViewMounted) {
    props = lastSnapshot.props;
    viewTag = lastSnapshot.viewTag;
    viewName = lastSnapshot.viewName;

    [_componentUpdateBuffer removeObjectForKey:viewTag];

    if (_componentUpdateBuffer.count == 0) {
      atomic_store(&_shouldFlushUpdateBuffer, false);
    }
  }

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
    [self.uiManager synchronouslyUpdateViewOnUIThread:viewTag viewName:viewName props:uiProps];
  }
  if (nativeProps.count > 0) {
    [self enqueueUpdateViewOnNativeThread:viewTag viewName:viewName nativeProps:nativeProps trySynchronously:YES];
  }
  if (jsProps.count > 0) {
    [self.reanimatedModule sendEventWithName:@"onReanimatedPropsChange"
                                        body:@{@"viewTag" : viewTag, @"props" : jsProps}];
  }
  
  NSMutableDictionary *snapshotProps = [NSMutableDictionary new];
  snapshotProps[@"width"] = @(1);
  [self getProps:snapshotProps forView:[_uiManager shadowViewForReactTag:viewTag] viewName:viewName];
//  [self getProps:uiProps forView:[_uiManager viewForReactTag:viewTag] viewName:viewName];
//  [self getProps:nativeProps forView:[_uiManager viewForReactTag:viewTag] viewName:viewName];
  int a = 0;
}

- (void)getProps:(NSMutableDictionary<NSString *, id> *)snapshotProps forView:(id<RCTComponent>)view viewName:(NSString *)viewName
{
  if (!view) {
    return;
  }

  [snapshotProps enumerateKeysAndObjectsUsingBlock:^(NSString *key, id json, __unused BOOL *stop) {
    [self propBlockForKey:key viewName:viewName](view, json, snapshotProps);
  }];
}

- (RCTPropBlock)propBlockForKey:(NSString *)name viewName:(NSString *)viewName
{
  NSMutableDictionary *_componentDataByName = [_uiManager valueForKey:@"_componentDataByName"];
  RCTComponentData *componentData = _componentDataByName[viewName];
  RCTPropBlockDictionary *_viewPropBlocks = [componentData valueForKey:@"_viewPropBlocks"];
  
  RCTPropBlockDictionary *propBlocks = _viewPropBlocks;
  RCTPropBlock propBlock = propBlocks[name];
//  if (!propBlock) { //TMP
    propBlock = [self createPropBlock:name isShadowView:YES componentData:componentData];
//    propBlocks[name] = [propBlock copy];
//  }
  return propBlock;
}

- (RCTPropBlock)createPropBlock:(NSString *)name isShadowView:(BOOL)isShadowView componentData:(RCTComponentData *)componentData
{
  // Get type
  SEL type = NULL;
  NSString *keyPath = nil;
  SEL selector =
      NSSelectorFromString([NSString stringWithFormat:@"propConfig%@_%@", isShadowView ? @"Shadow" : @"", name]);
  if ([componentData.managerClass respondsToSelector:selector]) {
    NSArray<NSString *> *typeAndKeyPath = ((NSArray<NSString *> * (*)(id, SEL)) objc_msgSend)(componentData.managerClass, selector);
    type = selectorForType(typeAndKeyPath[0]);
    keyPath = typeAndKeyPath.count > 1 ? typeAndKeyPath[1] : nil;
  } else {
    int a = 0;
    return ^(__unused id view, __unused id json, __unused NSMutableDictionary<NSString *, id> * snapshotProps) {
    };
  }

  // Check for custom setter
  if ([keyPath isEqualToString:@"__custom__"]) {
    // Get custom setter. There is no default view in the shadow case, so the selector is different.
    //TODO
//    NSString *selectorString;
//    if (!isShadowView) {
//      selectorString =
//          [NSString stringWithFormat:@"set_%@:for%@View:withDefaultView:", name, isShadowView ? @"Shadow" : @""];
//    } else {
//      selectorString = [NSString stringWithFormat:@"set_%@:forShadowView:", name];
//    }
//
//    SEL customSetter = NSSelectorFromString(selectorString);
//    __weak RCTComponentData *weakSelf = componentData;
//    return ^(id<RCTComponent> view, id json) {
//      [weakSelf callCustomSetter:customSetter onView:view withProp:json isShadowView:isShadowView];
//    };
    return ^(__unused id view, __unused id json, __unused NSMutableDictionary<NSString *, id> * snapshotProps) {};
  } else {
    // Disect keypath
    NSString *key = name;
    NSArray<NSString *> *parts = [keyPath componentsSeparatedByString:@"."];
    if (parts) {
      key = parts.lastObject;
      parts = [parts subarrayWithRange:(NSRange){0, parts.count - 1}];
    }

    // Get property getter
    SEL getter = NSSelectorFromString(key);

    // Get property setter
    SEL setter = NSSelectorFromString(
        [NSString stringWithFormat:@"set%@%@:", [key substringToIndex:1].uppercaseString, [key substringFromIndex:1]]);

    // Build setter block
    void (^setterBlock)(id target, id json, NSMutableDictionary<NSString *, id> * snapshotProps) = nil;
    if (type == NSSelectorFromString(@"RCTBubblingEventBlock:") ||
        type == NSSelectorFromString(@"RCTDirectEventBlock:") ||
        type == NSSelectorFromString(@"RCTCapturingEventBlock:")) {
      // Special case for event handlers
      //TODO ???
//      setterBlock =
//          createEventSetter(name, setter, self.eventInterceptor, _bridge ? _bridge.eventDispatcher : _eventDispatcher);
    } else {
      // Ordinary property handlers
      NSMethodSignature *typeSignature = [[RCTConvert class] methodSignatureForSelector:type];
      if (!typeSignature) {
        RCTLogError(@"No +[RCTConvert %@] function found.", NSStringFromSelector(type));
        return ^(__unused id<RCTComponent> view, __unused id json, __unused NSMutableDictionary<NSString *, id> * snapshotProps) {};
      }
      switch (typeSignature.methodReturnType[0]) {
#define RCT_CASE(_value, _type)                                       \
  case _value: {                                                      \
    __block BOOL setDefaultValue = NO;                                \
    __block _type defaultValue;                                       \
    _type (*convert)(id, SEL, id) = (typeof(convert))objc_msgSend;    \
    _type (*get)(id, SEL) = (typeof(get))objc_msgSend;                \
    void (*set)(id, SEL, _type) = (typeof(set))objc_msgSend;          \
    setterBlock = ^(id target, id json, NSMutableDictionary<NSString *, id> * snapshotProps) {                             \
      if (json) {                                                     \
        if (!setDefaultValue && target) {                             \
          if ([target respondsToSelector:getter]) {                   \
            defaultValue = get(target, getter);                       \
          }                                                           \
          setDefaultValue = YES;                                      \
        }                                                             \
        set(target, setter, convert([RCTConvert class], type, json)); \
      } else if (setDefaultValue) {                                   \
        set(target, setter, defaultValue);                            \
      }                                                               \
    };                                                                \
    break;                                                            \
  }

        RCT_CASE(_C_SEL, SEL)
        RCT_CASE(_C_CHARPTR, const char *)
        RCT_CASE(_C_CHR, char)
        RCT_CASE(_C_UCHR, unsigned char)
        RCT_CASE(_C_SHT, short)
        RCT_CASE(_C_USHT, unsigned short)
        RCT_CASE(_C_INT, int)
        RCT_CASE(_C_UINT, unsigned int)
        RCT_CASE(_C_LNG, long)
        RCT_CASE(_C_ULNG, unsigned long)
        RCT_CASE(_C_LNG_LNG, long long)
        RCT_CASE(_C_ULNG_LNG, unsigned long long)
        RCT_CASE(_C_FLT, float)
//        RCT_CASE(_C_DBL, double)
        RCT_CASE(_C_BOOL, BOOL)
        RCT_CASE(_C_PTR, void *)
        RCT_CASE(_C_ID, id)
        
        case _C_DBL: {                                                      
          __block BOOL setDefaultValue = NO;                                
          __block double defaultValue;                                       
          double (*convert)(id, SEL, id) = (typeof(convert))objc_msgSend;    
          double (*get)(id, SEL) = (typeof(get))objc_msgSend;                
          void (*set)(id, SEL, double) = (typeof(set))objc_msgSend;          
          setterBlock = ^(id target, id json, NSMutableDictionary<NSString *, id> * snapshotProps) {                             
            if (json) {                                                     
              if (!setDefaultValue && target) {                             
                if ([target respondsToSelector:getter]) {                   
                  defaultValue = get(target, getter);                       
                }                                                           
                setDefaultValue = YES;                                      
              }                                                             
              set(target, setter, convert([RCTConvert class], type, json)); 
            } else if (setDefaultValue) {                                   
              set(target, setter, defaultValue);                            
            }                                                               
          };                                                                
          break;                                                            
        }

        case _C_STRUCT_B:
        default: {
          setterBlock = createNSInvocationSetter(typeSignature, type, getter, setter);
          break;
        }
      }
    }

    return ^(__unused id view, __unused id json, __unused NSMutableDictionary<NSString *, id> * snapshotProps) {
      // Follow keypath
      id target = view;
      for (NSString *part in parts) {
        target = [target valueForKey:part];
      }

      // Set property with json
      setterBlock(target, RCTNilIfNull(json), snapshotProps);
    };
  }
}

static SEL selectorForType(NSString *type)
{
  const char *input = type.UTF8String;
  return NSSelectorFromString([RCTParseType(&input) stringByAppendingString:@":"]);
}

static RCTPropBlock createNSInvocationSetter(NSMethodSignature *typeSignature, SEL type, SEL getter, SEL setter)
{
  NSInvocation *typeInvocation = [NSInvocation invocationWithMethodSignature:typeSignature];
  typeInvocation.selector = type;
  typeInvocation.target = [RCTConvert class];

  __block NSInvocation *targetInvocation = nil;
  __block NSMutableData *defaultValue = nil;

  return ^(id target, id json, NSMutableDictionary<NSString *, id> * snapshotProps) {
    if (!target) {
      return;
    }

    // Get default value
    if (!defaultValue) {
      if (!json) {
        // We only set the defaultValue when we first pass a non-null
        // value, so if the first value sent for a prop is null, it's
        // a no-op (we'd be resetting it to its default when its
        // value is already the default).
        return;
      }
      // Use NSMutableData to store defaultValue instead of malloc, so
      // it will be freed automatically when setterBlock is released.
      defaultValue = [[NSMutableData alloc] initWithLength:typeSignature.methodReturnLength];
      if ([target respondsToSelector:getter]) {
        NSMethodSignature *signature = [target methodSignatureForSelector:getter];
        NSInvocation *sourceInvocation = [NSInvocation invocationWithMethodSignature:signature];
        sourceInvocation.selector = getter;
        [sourceInvocation invokeWithTarget:target];
        [sourceInvocation getReturnValue:defaultValue.mutableBytes];
        snapshotProps[@"width"] = @(((YGValue *)defaultValue.mutableBytes)->value);
        int a = 0;
      }
    }

    // Get value
    BOOL freeValueOnCompletion = NO;
    void *value = defaultValue.mutableBytes;
    if (json) {
//      freeValueOnCompletion = YES;
//      value = malloc(typeSignature.methodReturnLength);
//      if (!value) {
//        // CWE - 391 : Unchecked error condition
//        // https://www.cvedetails.com/cwe-details/391/Unchecked-Error-Condition.html
//        // https://eli.thegreenplace.net/2009/10/30/handling-out-of-memory-conditions-in-c
//        abort();
//      }
//      [typeInvocation setArgument:&json atIndex:2];
//      [typeInvocation invoke];
//      [typeInvocation getReturnValue:value];
//      po ((YGValue *)value).value
//      snapshotProps[@"width"] = @(((YGValue *)value)->value);
      int a = 0;
    }

    // Set value
//    if (!targetInvocation) {
//      NSMethodSignature *signature = [target methodSignatureForSelector:setter];
//      targetInvocation = [NSInvocation invocationWithMethodSignature:signature];
//      targetInvocation.selector = setter;
//    }
//    [targetInvocation setArgument:value atIndex:2];
//    [targetInvocation invokeWithTarget:target];
    if (freeValueOnCompletion) {
      // Only free the value if we `malloc`d it locally, otherwise it
      // points to `defaultValue.mutableBytes`, which is managed by ARC.
      free(value);
    }
  };
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

- (void)maybeFlushUpdateBuffer
{
  RCTAssertUIManagerQueue();
  bool shouldFlushUpdateBuffer = atomic_load(&_shouldFlushUpdateBuffer);
  if (!shouldFlushUpdateBuffer) {
    return;
  }

  __weak __typeof__(self) weakSelf = self;
  [_uiManager addUIBlock:^(__unused RCTUIManager *manager, __unused NSDictionary<NSNumber *, UIView *> *viewRegistry) {
    __typeof__(self) strongSelf = weakSelf;
    if (strongSelf == nil) {
      return;
    }
    atomic_store(&strongSelf->_shouldFlushUpdateBuffer, false);
    NSMutableDictionary *componentUpdateBuffer = [strongSelf->_componentUpdateBuffer copy];
    strongSelf->_componentUpdateBuffer = [NSMutableDictionary new];
    for (NSNumber *tag in componentUpdateBuffer) {
      ComponentUpdate *componentUpdate = componentUpdateBuffer[tag];
      if (componentUpdate == Nil) {
        continue;
      }
      [strongSelf updateProps:componentUpdate.props
                ofViewWithTag:componentUpdate.viewTag
                     withName:componentUpdate.viewName];
    }
    [strongSelf performOperations];
  }];
}

#endif // RCT_NEW_ARCH_ENABLED

@end
