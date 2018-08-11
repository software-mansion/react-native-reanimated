#import "REANode.h"
#import "REANodesManager.h"

#import <React/RCTDefines.h>

@interface REAEvalContext()
@property (nonatomic, nonnull) NSMutableArray< REANode * >  *updatedNodes;
@end


@implementation REAEvalContext
static int _nextContextID = 0;

- (instancetype)init
{
  if ((self = [super init])) {
    _updatedNodes = [NSMutableArray new];
    _memoizedValues = [NSMutableDictionary new];
    _lastLoopIDs = [NSMutableDictionary new];
    _contextID = [NSNumber numberWithInt:_nextContextID++];
  }
  return self;
}

@end


@interface REANode ()

@property (nonatomic) NSUInteger lastLoopID;
@property (nonatomic) id memoizedValue;
@property (nonatomic, nullable) NSMutableArray<REANode *> *childNodes;

@end

@implementation REANode

- (instancetype)initWithID:(REANodeID)nodeID config:(NSDictionary<NSString *,id> *)config
{
  if ((self = [super init])) {
    _nodeID = nodeID;
    _lastLoopID = 0;
  }
  return self;
}

RCT_NOT_IMPLEMENTED(- (instancetype)init)

- (void)dangerouslyRescheduleEvaluate:(REAEvalContext *)evalContext;
{
  _lastLoopID = 0;
  [self markUpdated:evalContext];
}

- (void)forceUpdateMemoizedValue:(id)value
                withEvalContext:(REAEvalContext *)evalContext;
{
  _memoizedValue = value;
  [self markUpdated:evalContext];
}

- (id)evaluate:(REAEvalContext *)evalContext;
{
  return 0;
}

- (id)value:(REAEvalContext *)evalContext;
{
  if (_lastLoopID < _nodesManager.loopID) {
    _lastLoopID = _nodesManager.loopID;
    return (_memoizedValue = [self evaluate:evalContext]);
  }
  return _memoizedValue;
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

- (void)markUpdated:(REAEvalContext *)evalContext;
{
  [evalContext.updatedNodes addObject:self];
  [self.nodesManager postRunUpdatesAfterAnimation];
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
{
  if ([visitedNodes containsObject:node]) {
    return;
  } else {
    [visitedNodes addObject:node];
  }
  for (REANode *child in node.childNodes) {
    [self findAndUpdateNodes:child withVisitedSet:visitedNodes withFinalNodes:finalNodes];
  }
  if ([node conformsToProtocol:@protocol(REAFinalNode)]) {
    [finalNodes addObject:(id<REAFinalNode>)node];
  }
}

+ (void)runPropUpdates:(REANodesManager *)nodesManager
{
  NSMutableSet<REANode *> *visitedNodes = [NSMutableSet new];
  NSMutableArray<id<REAFinalNode>> *finalNodes = [NSMutableArray new];
  for (NSUInteger i = 0; i < nodesManager.globalEvalContext.updatedNodes.count; i++) {
    [self findAndUpdateNodes:nodesManager.globalEvalContext.updatedNodes[i]
              withVisitedSet:visitedNodes
              withFinalNodes:finalNodes];
  }
  while (finalNodes.count > 0) {
    // NSMutableArray used for stack implementation
    [[finalNodes lastObject] update];
    [finalNodes removeLastObject];
  }
  [nodesManager.globalEvalContext.updatedNodes removeAllObjects];
  nodesManager.loopID++;
}

@end
