#import "REAFrameEvaluation.h"
#import "REANode.h"
#import "REANodesManager.h"
#import "Nodes/REAProceduralNode.h"

@implementation REAFrameEvaluation {
  REANodesManager *_nodesManager;
}
-(instancetype)initWithNodesManager:(REANodesManager *)nodesNamanger
{
  if (self = [super init]) {
    _nodesManager = nodesNamanger;
  }
  return self;
}

- (void)findAndUpdateNodes:(nonnull REANode *)node
            withVisitedSet:(NSMutableDictionary<NSNumber*, NSMutableSet<REANode*>*> *)visitedNodes
            withFinalNodes:(NSMutableArray<id<REAFinalNode>> *)finalNodes
        withStackedContext:(NSMutableArray<REAEvalContext *> *)contexts
       withLastVisitedNode:(REANode *)lastVisited
{
  REAEvalContext *currentContext = contexts.lastObject;
  if (visitedNodes[currentContext.contextID]) {
    if ([visitedNodes[currentContext.contextID] containsObject:node]) {
      return;
    }
  } else {
    visitedNodes[currentContext.contextID] = [NSMutableSet new];
  }
  [visitedNodes[currentContext.contextID] addObject:node];
  NSMutableArray* children = node.childNodes;
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
  if ([node isKindOfClass:[REAProceduralNode class]] && currentContext.parent) {
    [self findAndUpdateNodes:currentContext.parent withVisitedSet:visitedNodes withFinalNodes:finalNodes withStackedContext:contexts withLastVisitedNode:node];
  } else if (children) {
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

- (void)runPropUpdates
{
  NSMutableDictionary<NSNumber*, NSMutableSet<REANode*>*> *visitedNodes = [NSMutableDictionary new];
  NSMutableArray<id<REAFinalNode>> *finalNodes = [NSMutableArray new];
  NSMutableArray<REAEvalContext *> *contexts = [NSMutableArray new];
  [contexts addObject:_nodesManager.globalEvalContext];
  for (NSUInteger i = 0; i < _nodesManager.globalEvalContext.updatedNodes.count; i++) {
    [self findAndUpdateNodes:_nodesManager.globalEvalContext.updatedNodes[i]
              withVisitedSet:visitedNodes
              withFinalNodes:finalNodes
          withStackedContext:contexts
         withLastVisitedNode:NULL
     ];
    RCTAssert(contexts.count == 1, @"Stacking of contexts was not performed correctly");
    if (i == _nodesManager.globalEvalContext.updatedNodes.count - 1) {
      while (finalNodes.count > 0) {
        // NSMutableArray used for stack implementation
        [[finalNodes lastObject] update];
        [finalNodes removeLastObject];
      }
    }
  }
  [_nodesManager.globalEvalContext.updatedNodes removeAllObjects];
  _nodesManager.loopID++;
}
@end
