#import "REAProceduralNode.h"

#import "REAModule.h"
#import <React/RCTLog.h>
#import <React/RCTUIManager.h>
#import "REANodesManager.h"
#import "REAEvalContext.h"


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
  NSMutableDictionary<NSNumber *, REANode *> *_valuesByContext;
  NSMutableDictionary<NSNumber *, REAEvalContext *> *_contextsByValue;
  NSMutableDictionary<NSNumber *, REAEvalContext *> *_oldContextsByValue;
}

- (instancetype)initWithID:(REANodeID)nodeID config:(NSDictionary<NSString *,id> *)config
{
  if ((self = [super initWithID:nodeID config:config])) {
    _valuesByContext = [NSMutableDictionary new];
    _contextsByValue = [NSMutableDictionary new];
    _oldContextsByValue = [NSMutableDictionary new];
  }
  return self;
}

- (void)matchContextWithNode:(REAEvalContext *) evalContext
                    withNode:(REANode *) node {
  [_valuesByContext setObject:node forKey:evalContext.contextID];
  [_contextsByValue setObject:evalContext forKey:node.nodeID];
}

- (void)matchNodeWithOldContext:(REANode *) node
                    withContext:(REAEvalContext *) evalContext {
  [_oldContextsByValue setObject:evalContext forKey:node.nodeID];
}

- (void)dropContext:(REAEvalContext *)evalContext {
  REANode *relatedNode = [_valuesByContext objectForKey:evalContext.contextID];
  [_contextsByValue removeObjectForKey:relatedNode.nodeID];
  [_valuesByContext removeObjectForKey:evalContext.contextID];
  [_oldContextsByValue removeObjectForKey:relatedNode.nodeID];
}

- (REAEvalContext *)contextForUpdatingChildren:(REAEvalContext *)evalContext
                           withLastVisitedNode:(REANode *) lastVisited
{
  if (lastVisited == NULL) {
    return evalContext;
  }
  return [_contextsByValue objectForKey:lastVisited.nodeID];
}

- (void)setValue:(NSNumber *)value withEvalContext:(REAEvalContext *)evalContext {
  [(REAValueNode *)[_valuesByContext objectForKey:evalContext.contextID] setValue:value withEvalContext:self.nodesManager.globalEvalContext];
}

- (id)evaluate:(REAEvalContext *)evalContext;
{
  RCTAssert(evalContext != self.nodesManager.globalEvalContext, @"Tried to evaluate argumentNode in global context");
  REANode *value = [_valuesByContext objectForKey:evalContext.contextID];
  return [value value:[_oldContextsByValue objectForKey:value.nodeID]];
}

@end
