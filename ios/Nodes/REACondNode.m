#import "REACondNode.h"
#import "REANodesManager.h"

@implementation REACondNode {
  NSNumber *_condNodeID;
  NSNumber *_ifBlockID;
  NSNumber *_elseBlockID;
}

- (instancetype)initWithID:(REANodeID)nodeID config:(NSDictionary<NSString *,id> *)config
{
  if ((self = [super initWithID:nodeID config:config])) {
    _condNodeID = config[@"cond"];
    _ifBlockID = config[@"ifBlock"];
    _elseBlockID = config[@"elseBlock"];
  }
  return self;
}

- (id)evaluate:(REAEvalContext *)evalContext;
{
  id cond = [[self.nodesManager findNodeByID:_condNodeID] value:evalContext];
  if ([cond doubleValue]) {
    return [[self.nodesManager findNodeByID:_ifBlockID] value:evalContext];
  }
  return _elseBlockID != nil ? [[self.nodesManager findNodeByID:_elseBlockID] value:evalContext] : @(0);
}

@end
