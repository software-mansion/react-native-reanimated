#import "REAParamNode.h"
#import "REAValueNode.h"
#import "REANodesManager.h"

@implementation REAParamNode {
  NSMutableArray<REANodeID> *_argstack;
}

- (instancetype)initWithID:(REANodeID)nodeID config:(NSDictionary<NSString *,id> *)config
{
  if ((self = [super initWithID:nodeID config:config])) {
    _argstack = [NSMutableArray<REANodeID> arrayWithCapacity:0];
  }
  return self;
}

- (void)setValue:(NSNumber *)value
{
  REANode *node = [self.nodesManager findNodeByID:[_argstack lastObject]];
  [(REAValueNode*)node setValue:value];
}

- (void)beginContext:(NSNumber*) ref {
  [_argstack addObject:ref];
}

- (void)endContext {
  [_argstack removeLastObject];
}


- (id)evaluate {
  REANode * node = [self.nodesManager findNodeByID:[_argstack lastObject]];
  return [node value];
}

@end
