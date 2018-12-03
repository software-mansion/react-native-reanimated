#import "REANode.h"
#import "REANodesManager.h"
#import "REAProceduralNode.h"
#import "REAEvalContext.h"

#import <React/RCTDefines.h>


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
  evalContext.lastLoops[_nodeID].ID = 0;
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
  REANodeLoopWrapper *__nullable lastLoop = evalContext.lastLoops[_nodeID];
  if (!lastLoop) {
    lastLoop = [[REANodeLoopWrapper alloc] init];
    evalContext.lastLoops[_nodeID] = lastLoop;
  }
  
  NSInteger lastLoopID = lastLoop.ID;
  
  if (lastLoopID < _nodesManager.loopID) {
    lastLoopID = _nodesManager.loopID;
    evalContext.lastLoops[_nodeID].ID = _nodesManager.loopID;
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

@end
