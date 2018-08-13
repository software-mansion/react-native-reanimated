#import "REANode.h"
#import "REANodesManager.h"
#import "REAProceduralNode.h"

#import <React/RCTDefines.h>

@interface REAEvalContext()
@property (nonatomic, nonnull) NSMutableArray< REANode * >  *updatedNodes;
@end


@implementation REAEvalContext
static int _nextContextID = 0;

- (instancetype)initWithParent:(REAPerformNode *) parent
{
  if ((self = [super init])) {
    _parent = _parent;
    _updatedNodes = [NSMutableArray new];
    _memoizedValues = [NSMutableDictionary new];
    _lastLoopIDs = [NSMutableDictionary new];
    _contextID = [NSNumber numberWithInt:_nextContextID++];
  }
  return self;
}

@end


@implementation REANode

- (instancetype)initWithID:(REANodeID)nodeID config:(NSDictionary<NSString *,id> *)config
{
  if ((self = [super init])) {
    _nodeID = nodeID;
  }
  return self;
}

RCT_NOT_IMPLEMENTED(- (instancetype)init)

- (void)dangerouslyRescheduleEvaluate:(REAEvalContext *)evalContext;
{
  evalContext.lastLoopIDs[_nodeID] = 0;
  [self markUpdated:evalContext];
}

- (void)forceUpdateMemoizedValue:(id)value
                withEvalContext:(REAEvalContext *)evalContext;
{
  evalContext.memoizedValues[_nodeID] = value;
  [self markUpdated:evalContext];
}

- (id)evaluate:(REAEvalContext *)evalContext;
{
  return 0;
}

- (id)value:(REAEvalContext *)evalContext;
{
  NSNumber *__nullable lastLoopID = evalContext.lastLoopIDs[_nodeID];
  if (!lastLoopID || lastLoopID < _nodesManager.loopID) {
    lastLoopID = _nodesManager.loopID;
    evalContext.lastLoopIDs[_nodeID] = _nodesManager.loopID;
    id result = [self evaluate:evalContext];
    evalContext.memoizedValues[_nodeID] = result;
    return result;
  }
  return evalContext.memoizedValues[_nodeID];
}

- (void)addChild:(REANode *)child
{
  if (!_childNodes) {
    _childNodes = [NSMutableArray new];
  }
  if (child) {
    [_childNodes addObject:child];
    [self dangerouslyRescheduleEvaluate:self.nodesManager.globalEvalContext];
  }
}

- (void)removeChild:(REANode *)child
{
  if (child) {
    [_childNodes removeObject:child];
  }
}

-(NSMutableArray *)getChildenByContext:(REAEvalContext *) evalContext {
  return _childNodes;
}

- (void)markUpdated:(REAEvalContext *)evalContext;
{
  [evalContext.updatedNodes addObject:self];
  [self.nodesManager postRunUpdatesAfterAnimation];
}

- (REAEvalContext *)switchContextWhileUpdatingIfNeeded:(REAEvalContext *)evalContext
                                   withLastVisitedNode:(REANode *) lastVisited
{
  return evalContext;
}

- (void)onDrop {
  // no-op
}

+ (NSMutableArray<REANode *> *)updatedNodes
{
  static NSMutableArray<REANode *> *updatedNodes;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    updatedNodes = [NSMutableArray new];
  });
  return updatedNodes;
}

+ (void)findAndUpdateNodes:(nonnull REANode *)node
            withVisitedSet:(NSMutableSet<REANode *> *)visitedNodes
            withFinalNodes:(NSMutableArray<id<REAFinalNode>> *)finalNodes
        withStackedContext:(NSMutableArray<REAEvalContext *> *)contexts
       withLastVisitedNode:(REANode *)lastVisited
{
  if ([visitedNodes containsObject:node]) {
    return;
  } else {
    [visitedNodes addObject:node];
  }
  
  REAEvalContext *currentContext = contexts.lastObject;
  NSMutableArray *__nullable children = [node getChildenByContext:currentContext];
  REAEvalContext *newContext = [node switchContextWhileUpdatingIfNeeded:currentContext withLastVisitedNode:lastVisited];
  BOOL pushedNewContext = false;
  REAEvalContext *__nullable contextPopped = NULL;
  
  if (newContext != currentContext && currentContext) {
    [contexts addObject:newContext];
    pushedNewContext = true;
  }
  
  if ([node isKindOfClass:[REAPerformNode class]] && contexts.count > 1) {
    contextPopped = [contexts lastObject];
    [contexts removeLastObject];
  }
  
  if (children) {
    for (REANode *child in children) {
      [self findAndUpdateNodes:child withVisitedSet:visitedNodes withFinalNodes:finalNodes withStackedContext:contexts withLastVisitedNode:node];
    }
  }
  
  if ([node conformsToProtocol:@protocol(REAFinalNode)]) {
    [finalNodes addObject:(id<REAFinalNode>)node];
  }
  
  if (pushedNewContext) {
    [contexts removeLastObject];
  }
  
  if (contextPopped) {
    [contexts addObject:contextPopped];
  }
}

+ (void)runPropUpdates:(REANodesManager *)nodesManager
{
  NSMutableSet<REANode *> *visitedNodes = [NSMutableSet new];
  NSMutableArray<id<REAFinalNode>> *finalNodes = [NSMutableArray new];
  NSMutableArray<REAEvalContext *> *contexts = [NSMutableArray new];
  [contexts addObject:nodesManager.globalEvalContext];
  for (NSUInteger i = 0; i < nodesManager.globalEvalContext.updatedNodes.count; i++) {
    [self findAndUpdateNodes:nodesManager.globalEvalContext.updatedNodes[i]
              withVisitedSet:visitedNodes
              withFinalNodes:finalNodes
          withStackedContext:contexts
         withLastVisitedNode:NULL
     ];
    if (contexts.count != 1) {
      // error TODO
    }
    if (i == nodesManager.globalEvalContext.updatedNodes.count - 1) {
      while (finalNodes.count > 0) {
        // NSMutableArray used for stack implementation
        [[finalNodes lastObject] update];
        [finalNodes removeLastObject];
      }
    }
  }
  [nodesManager.globalEvalContext.updatedNodes removeAllObjects];
  nodesManager.loopID = [NSNumber numberWithLong: [nodesManager.loopID longValue] + 1];
}

@end
