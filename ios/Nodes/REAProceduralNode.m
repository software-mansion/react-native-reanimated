#import "REAProceduralNode.h"

#import "REAModule.h"
#import <React/RCTLog.h>
#import <React/RCTUIManager.h>
#import "REANodesManager.h"
#import "REAEvalContext.h"

@interface BidirectionalContextNodeMap : NSObject
- (void)dropByContext:(REAEvalContext *) evalContext;
- (void)put:(REAEvalContext *) evalContext
   withNode:(REANode *) node;
- (REANode *)getNode:(REAEvalContext *) evalContext;
- (REAEvalContext *)getContext:(REANode *) node;
@end

@implementation BidirectionalContextNodeMap
{
  NSMutableDictionary<NSNumber *, REANode *> *_nodesByContext;
  NSMutableDictionary<NSNumber *, REAEvalContext *> *_contextsByNode;
}
- (instancetype)init
{
  if ((self = [super init])) {
    _nodesByContext = [NSMutableDictionary new];
    _contextsByNode = [NSMutableDictionary new];
  }
  return self;
}

- (void)dropByContext:(REAEvalContext *) evalContext
{
  REANode *node = [_nodesByContext objectForKey:evalContext.contextID];
  [_nodesByContext removeObjectForKey:evalContext.contextID];
  [_contextsByNode removeObjectForKey:node.nodeID];
}
- (void)put:(REAEvalContext *) evalContext
   withNode:(REANode *) node
{
  [_contextsByNode setObject:evalContext forKey:node.nodeID];
  [_nodesByContext setObject:node forKey:evalContext.contextID];
}
- (REANode *)getNode:(REAEvalContext *) evalContext
{
  return [_nodesByContext objectForKey:evalContext.contextID];
}
- (REAEvalContext *)getContext:(REANode *) node
{
  return [_contextsByNode objectForKey:node.nodeID];
}

@end

@interface REAArgumentNode ()

- (void)matchContextWithNode:(REAEvalContext *) evalContext
                    withNode:(REANode *) node;
- (void)matchNodeWithOldContext:(REANode *) node
                    withContext:(REAEvalContext *) evalContext;
- (void)dropContext:(REAEvalContext *)evalContext;
- (REAEvalContext *)contextForUpdatingChildren:(REAEvalContext *)evalContext
                           withLastVisitedNode:(REANode *) lastVisited;

@end

@implementation REAProceduralNode
{
  NSNumber *_resultNode;
}

- (instancetype)initWithID:(REANodeID)nodeID config:(NSDictionary<NSString *,id> *)config
{
  if ((self = [super initWithID:nodeID config:config])) {
    _resultNode = config[@"result"];
    _proceduralArguments = config[@"arguments"];
  }
  return self;
}

- (id)evaluate:(REAEvalContext *)evalContext;
{
  return [[self.nodesManager findNodeByID:_resultNode] value:evalContext];
}

@end


@implementation REAPerformNode
{
  NSNumber * _proceduralNode;
  NSArray<NSNumber *> *_argumentsInput;
  REAEvalContext *_oldContext;
  REAEvalContext *_evalContext;
}

- (instancetype)initWithID:(REANodeID)nodeID config:(NSDictionary<NSString *,id> *)config
{
  if ((self = [super initWithID:nodeID config:config])) {
    _proceduralNode = config[@"proceduralNode"];
    _argumentsInput = config[@"args"];
    _evalContext = [[REAEvalContext alloc] initWithParent:self];
  }
  return self;
}

- (id)evaluate:(REAEvalContext *)oldEvalContext;
{
  if (_oldContext == NULL) {
    REAProceduralNode *proceduralNode = (REAProceduralNode *)[self.nodesManager findNodeByID:_proceduralNode];
    _oldContext = oldEvalContext;
    for (int i = 0; i < _argumentsInput.count; i++) {
      NSNumber *argumentID = proceduralNode.proceduralArguments[i];
      REAArgumentNode *arg = (REAArgumentNode *)[self.nodesManager findNodeByID:argumentID];
      REANode *inputNode = [self.nodesManager findNodeByID:_argumentsInput[i]];
      [arg matchContextWithNode:_evalContext withNode:inputNode];
      [arg matchNodeWithOldContext:inputNode withContext:oldEvalContext];
    }
  } else {
    RCTAssert(_oldContext == oldEvalContext, @"Tried to evaluate perform node in more than one contexts");
  }
  
  REAProceduralNode *proceduralNode = (REAProceduralNode *)[self.nodesManager findNodeByID:_proceduralNode];
  return [proceduralNode value:_evalContext];
}

- (void)onDrop
{
  if (![self.nodesManager isNodeCreated:_proceduralNode]) {
    return;
  }
  REAProceduralNode *proceduralNode = (REAProceduralNode *)[self.nodesManager findNodeByID:_proceduralNode];
  if (_oldContext) {
    for (int i = 0; i < _argumentsInput.count; i++) {
      if ([self.nodesManager isNodeCreated:proceduralNode.proceduralArguments[i]]) {
        REAArgumentNode *arg = (REAArgumentNode *)[self.nodesManager findNodeByID:proceduralNode.proceduralArguments[i]];
        [arg dropContext:_evalContext];
      }
    }
  }
}

@end


@implementation REAArgumentNode
{
  NSMutableDictionary<NSNumber *, REAEvalContext *> *_oldContextsByNode;
  BidirectionalContextNodeMap *_nodeContextMap;
}

- (instancetype)initWithID:(REANodeID)nodeID config:(NSDictionary<NSString *,id> *)config
{
  if ((self = [super initWithID:nodeID config:config])) {
    _oldContextsByNode = [NSMutableDictionary new];
    _nodeContextMap = [[BidirectionalContextNodeMap alloc ] init];
  }
  return self;
}

- (void)matchContextWithNode:(REAEvalContext *) evalContext
                    withNode:(REANode *) node {
  [_nodeContextMap put:evalContext withNode:node];
}

- (void)matchNodeWithOldContext:(REANode *) node
                    withContext:(REAEvalContext *) evalContext {
  [_oldContextsByNode setObject:evalContext forKey:node.nodeID];
}

- (void)dropContext:(REAEvalContext *)evalContext {
  [_oldContextsByNode removeObjectForKey:[_nodeContextMap getNode:evalContext].nodeID];
  [_nodeContextMap dropByContext:evalContext];
}

- (REAEvalContext *)contextForUpdatingChildren:(REAEvalContext *)evalContext
                           withLastVisitedNode:(REANode *) lastVisited
{
  if (lastVisited == NULL) {
    return evalContext;
  }
  return [_nodeContextMap getContext:lastVisited];
}

- (void)setValue:(NSNumber *)value
 withEvalContext:(REAEvalContext *)evalContext {
  [(REAValueNode *)[_nodeContextMap getNode:evalContext]
   setValue:value withEvalContext:self.nodesManager.globalEvalContext];
}

- (id)evaluate:(REAEvalContext *)evalContext;
{
  RCTAssert(evalContext != self.nodesManager.globalEvalContext, @"Tried to evaluate argumentNode in global context");
  REANode *value = [_nodeContextMap getNode:evalContext];
  return [value value:[_oldContextsByNode objectForKey:value.nodeID]];
}

@end
