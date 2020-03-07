#import "REAModule.h"

#import "REANodesManager.h"
#import "Transitioning/REATransitionManager.h"
#import <React/RCTModuleData.h>
#import <React/RCTBridgeMethod.h>
#import <React-Core/React/RCTModuleMethod.h>
#import <React/RCTModuleMethod.h>
#import <objc/runtime.h>
#import <objc/message.h>

typedef void (^AnimatedOperation)(REANodesManager *nodesManager);

@implementation REAModule
{
  REANodesManager *_nodesManager;
  NSMutableArray<AnimatedOperation> *_operations;
  REATransitionManager *_transitionManager;
}

RCT_EXPORT_MODULE(ReanimatedModule);

- (void)invalidate
{
  _transitionManager = nil;
  [_nodesManager invalidate];
  [self.bridge.eventDispatcher removeDispatchObserver:self];
  [self.bridge.uiManager.observerCoordinator removeObserver:self];
}

- (dispatch_queue_t)methodQueue
{
  // This module needs to be on the same queue as the UIManager to avoid
  // having to lock `_operations` and `_preOperations` since `uiManagerWillPerformMounting`
  // will be called from that queue.
  return RCTGetUIManagerQueue();
}

- (void)setBridge:(RCTBridge *)bridge
{
  [super setBridge:bridge];

  _nodesManager = [[REANodesManager alloc] initWithModule:self
                                                uiManager:self.bridge.uiManager];
  _operations = [NSMutableArray new];

  _transitionManager = [[REATransitionManager alloc] initWithUIManager:self.bridge.uiManager];

  [bridge.eventDispatcher addDispatchObserver:self];
  [bridge.uiManager.observerCoordinator addObserver:self];
}

#pragma mark -- Transitioning API

RCT_EXPORT_METHOD(animateNextTransition:(nonnull NSNumber *)rootTag config:(NSDictionary *)config)
{
  [_transitionManager animateNextTransitionInRoot:rootTag withConfig:config];
}

#pragma mark -- API

RCT_EXPORT_METHOD(createNode:(nonnull NSNumber *)nodeID
                  config:(NSDictionary<NSString *, id> *)config)
{
  [self addOperationBlock:^(REANodesManager *nodesManager) {
    [nodesManager createNode:nodeID config:config];
  }];
}

RCT_EXPORT_METHOD(dropNode:(nonnull NSNumber *)nodeID)
{
  [self addOperationBlock:^(REANodesManager *nodesManager) {
    [nodesManager dropNode:nodeID];
  }];
}

RCT_EXPORT_METHOD(getValue:(nonnull NSNumber *)nodeID
                  callback:(RCTResponseSenderBlock)callback) {
  [self addOperationBlock:^(REANodesManager *nodesManager) {
    [nodesManager getValue:nodeID callback:(RCTResponseSenderBlock)callback];
  }];
}

RCT_EXPORT_METHOD(connectNodes:(nonnull NSNumber *)parentID
                  childTag:(nonnull NSNumber *)childID)
{
  [self addOperationBlock:^(REANodesManager *nodesManager) {
    [nodesManager connectNodes:parentID childID:childID];
  }];
}

RCT_EXPORT_METHOD(disconnectNodes:(nonnull NSNumber *)parentID
                  childTag:(nonnull NSNumber *)childID)
{
  [self addOperationBlock:^(REANodesManager *nodesManager) {
    [nodesManager disconnectNodes:parentID childID:childID];
  }];
}

RCT_EXPORT_METHOD(connectNodeToView:(nonnull NSNumber *)nodeID
                  viewTag:(nonnull NSNumber *)viewTag)
{
  NSString *viewName = [self.bridge.uiManager viewNameForReactTag:viewTag];
  [self addOperationBlock:^(REANodesManager *nodesManager) {
    [nodesManager connectNodeToView:nodeID viewTag:viewTag viewName:viewName];
  }];
}

RCT_EXPORT_METHOD(disconnectNodeFromView:(nonnull NSNumber *)nodeID
                  viewTag:(nonnull NSNumber *)viewTag)
{
  [self addOperationBlock:^(REANodesManager *nodesManager) {
    [nodesManager disconnectNodeFromView:nodeID viewTag:viewTag];
  }];
}

RCT_EXPORT_METHOD(attachEvent:(nonnull NSNumber *)viewTag
                  eventName:(nonnull NSString *)eventName
                  eventNodeID:(nonnull NSNumber *)eventNodeID)
{
  [self addOperationBlock:^(REANodesManager *nodesManager) {
    [nodesManager attachEvent:viewTag eventName:eventName eventNodeID:eventNodeID];
  }];
}

RCT_EXPORT_METHOD(detachEvent:(nonnull NSNumber *)viewTag
                  eventName:(nonnull NSString *)eventName
                  eventNodeID:(nonnull NSNumber *)eventNodeID)
{
  [self addOperationBlock:^(REANodesManager *nodesManager) {
    [nodesManager detachEvent:viewTag eventName:eventName eventNodeID:eventNodeID];
  }];
}

RCT_EXPORT_METHOD(configureProps:(nonnull NSArray<NSString *> *)nativeProps
                         uiProps:(nonnull NSArray<NSString *> *)uiProps)
{
  [self addOperationBlock:^(REANodesManager *nodesManager) {
    [nodesManager configureProps:[NSSet setWithArray:nativeProps] uiProps:[NSSet setWithArray:uiProps]];
  }];
}

RCT_EXPORT_METHOD(setValue:(nonnull NSNumber *)nodeID
                  newValue:(nonnull NSNumber *)newValue
                  )
{
  [self addOperationBlock:^(REANodesManager *nodesManager) {
    [nodesManager setValueForNodeID:nodeID value:newValue];
  }];
}



RCT_EXPORT_METHOD(getDirectManipulationUtil:
                  (RCTPromiseResolveBlock)resolve
                  rejecter:(__unused RCTPromiseRejectBlock)reject)
{
    NSMutableDictionary *modules = [NSMutableDictionary new];
    NSMutableArray *viewManagers = [NSMutableArray new];
    NSString *moduleName;
    for (Class moduleClass in [self.bridge moduleClasses]) {
        moduleName = NSStringFromClass(moduleClass);
        if ([moduleClass moduleName] != nil) {
            //moduleName = [moduleClass moduleName];
        }
        BOOL isViewManager = [[self.bridge moduleForClass:moduleClass] isKindOfClass:[RCTViewManager class]];
        if (isViewManager) {
            [viewManagers addObject:moduleName];
        }
        //RCTModuleData *moduleData = [self.bridge moduleDataForName:RCTBridgeModuleNameForClass(moduleClass)];
        NSMutableDictionary<NSString *, NSArray<NSDictionary<NSString *, NSString *> *> *> *methods = [self getArgumentTypeNames:moduleClass];
        [modules setObject:methods forKey:moduleName];
        RCTModuleData *moduleData = [[RCTModuleData alloc] initWithModuleClass:moduleClass bridge:self.bridge];
        /*
        for (id<RCTBridgeMethod> method in moduleData.methods) {
            //SEL s = method_getName((__bridge Method _Nonnull)(method));

            [modules setObject:methods forKey:[method JSMethodName]];
        }
         */
    }
    resolve(@{
              @"nativeModules": modules,
              @"viewManagers": viewManagers,
              @"JSEvents": @[]
              });
}

- (void) resolveViewManger
{
    //[self.bridge.uiManager methodsToExport]
    id<RCTBridgeDelegate> delegate = self.bridge.delegate;
    /*
     if (![delegate respondsToSelector:@selector(bridge:didNotFindModule:)]) {
     resolve( @{@"fuck":@true});
     return;
     }
     */
    NSString *name = @"RCTScrollView";
    NSString *moduleName = name;
    BOOL result = [delegate bridge:self.bridge didNotFindModule:moduleName];
    if (!result) {
        moduleName = [name stringByAppendingString:@"Manager"];
        result = [delegate bridge:self.bridge didNotFindModule:moduleName];
    }
    if (!result) {
        //resolve( @{});
        //return;
    }

    id module = [self.bridge moduleForName:moduleName lazilyLoadIfNecessary:RCTTurboModuleEnabled()];
    if (module == nil) {
        // There is all sorts of code in this codebase that drops prefixes.
        //
        // If we didn't find a module, it's possible because it's stored under a key
        // which had RCT Prefixes stripped. Lets check one more time...
        module = [self.bridge moduleForName:RCTDropReactPrefixes(moduleName) lazilyLoadIfNecessary:RCTTurboModuleEnabled()];
    }
}

- (NSMutableDictionary<NSString *, NSArray<NSDictionary<NSString *, NSString *> *> *> *) getArgumentTypeNames:(Class)cls
{
    NSMutableDictionary<NSString *, NSArray<NSDictionary<NSString *, NSString *> *> *> *methodArgumentTypeNames = [NSMutableDictionary new];

    unsigned int numberOfMethods;
    Method *methods = class_copyMethodList(object_getClass(cls), &numberOfMethods);

    if (methods) {
        for (unsigned int i = 0; i < numberOfMethods; i++) {
            SEL s = method_getName(methods[i]);
            NSString *mName = NSStringFromSelector(s);
            RCTLog(@"nqme %@ ", mName);
            if (![mName hasPrefix:@"__rct_export__"]) {
                continue;
            }

            // Message dispatch logic from old infra
            RCTMethodInfo *(*getMethodInfo)(id, SEL) = (__typeof__(getMethodInfo))objc_msgSend;
            RCTMethodInfo *methodInfo = getMethodInfo(cls, s);

            NSArray<RCTMethodArgument *> *arguments;
            NSString *otherMethodName = RCTParseMethodSignature(methodInfo->objcName, &arguments);

            NSMutableArray *argumentTypes = [NSMutableArray arrayWithCapacity:[arguments count]];
            for (int j = 0; j < [arguments count]; j += 1) {
                [argumentTypes addObject:@{
                                           @"nativeType": arguments[j].type,
                                           @"type": @"object",
                                           @"name": @""
                                           }];
            }

            NSString *normalizedOtherMethodName = [otherMethodName componentsSeparatedByString:@":"][0];
            methodArgumentTypeNames[normalizedOtherMethodName] = argumentTypes;
        }
        free(methods);
    }

    return methodArgumentTypeNames;
}

#pragma mark -- Batch handling

- (void)addOperationBlock:(AnimatedOperation)operation
{
  [_operations addObject:operation];
}

#pragma mark - RCTUIManagerObserver

- (void)uiManagerWillPerformMounting:(RCTUIManager *)uiManager
{
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

#pragma mark -- Events

- (NSArray<NSString *> *)supportedEvents
{
  return @[@"onReanimatedCall", @"onReanimatedPropsChange"];
}

- (void)eventDispatcherWillDispatchEvent:(id<RCTEvent>)event
{
  // Events can be dispatched from any queue
  [_nodesManager dispatchEvent:event];
}

@end
