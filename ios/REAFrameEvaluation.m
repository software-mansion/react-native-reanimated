#import "REAFrameEvaluation.h"
#import "REANode.h"
#import "REANodesManager.h"
#import "Nodes/REAProceduralNode.h"

@implementation REAFrameEvaluation {
  REANodesManager *_nodesManager;
  NSMutableArray<id<REAFinalNode>> *_finalNodes;
  NSMutableArray<REAEvalContext *> *_contexts;
  NSMutableDictionary<NSNumber*, NSMutableSet<REANode*>*> *_visitedNodes;
}
-(instancetype)initWithNodesManager:(REANodesManager *)nodesNamanger
{
  if (self = [super init]) {
    _nodesManager = nodesNamanger;
    _visitedNodes = [NSMutableDictionary new];
    _finalNodes = [NSMutableArray new];
    _contexts = [NSMutableArray new];
  }
  return self;
}

- (void)findAndUpdateNodes:(nonnull REANode *)node
       withLastVisitedNode:(REANode *)lastVisited
{
  REAEvalContext *currentContext = _contexts.lastObject;
  if (_visitedNodes[currentContext.contextID]) {
    if ([_visitedNodes[currentContext.contextID] containsObject:node]) {
      return;
    }
  } else {
    _visitedNodes[currentContext.contextID] = [NSMutableSet new];
  }
  [_visitedNodes[currentContext.contextID] addObject:node];
  NSMutableArray* children = node.childNodes;
  REAEvalContext *newContext = [node switchContextWhileUpdatingIfNeeded:currentContext withLastVisitedNode:lastVisited];
  BOOL pushedNewContext = false;
  REAEvalContext *__nullable contextPopped = NULL;
  
  if (newContext != currentContext && currentContext) {
    [_contexts addObject:newContext];
    pushedNewContext = true;
  }
  
  if ([node isKindOfClass:[REAPerformNode class]] && _contexts.count > 1) {
    contextPopped = [_contexts lastObject];
    [_contexts removeLastObject];
  }
  if ([node isKindOfClass:[REAProceduralNode class]] && currentContext.parent) {
    [self findAndUpdateNodes:currentContext.parent withLastVisitedNode:node];
  } else if (children) {
    for (REANode *child in children) {
      [self findAndUpdateNodes:child withLastVisitedNode:node];
    }
  }
  
  if ([node conformsToProtocol:@protocol(REAFinalNode)]) {
    [_finalNodes addObject:(id<REAFinalNode>)node];
  }
  
  if (pushedNewContext) {
    [_contexts removeLastObject];
  }
  
  if (contextPopped) {
    [_contexts addObject:contextPopped];
  }
}

- (void)runPropUpdates
{
  [_contexts addObject:_nodesManager.globalEvalContext];
  for (NSUInteger i = 0; i < _nodesManager.globalEvalContext.updatedNodes.count; i++) {
    [self findAndUpdateNodes:_nodesManager.globalEvalContext.updatedNodes[i]
         withLastVisitedNode:NULL
     ];
    RCTAssert(_contexts.count == 1, @"Stacking of contexts was not performed correctly");
    if (i == _nodesManager.globalEvalContext.updatedNodes.count - 1) {
      while (_finalNodes.count > 0) {
        // NSMutableArray used for stack implementation
        [[_finalNodes lastObject] update];
        [_finalNodes removeLastObject];
      }
    }
  }
  [_nodesManager.globalEvalContext.updatedNodes removeAllObjects];
  _nodesManager.loopID++;
}
@end
