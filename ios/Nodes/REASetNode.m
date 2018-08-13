#import "REASetNode.h"
#import "REAValueNode.h"
#import "REANodesManager.h"

@implementation REASetNode {
  NSNumber *_whatNodeID;
  NSNumber *_valueNodeID;
}

- (instancetype)initWithID:(REANodeID)nodeID config:(NSDictionary<NSString *,id> *)config
{
  if ((self = [super initWithID:nodeID config:config])) {
    _whatNodeID = config[@"what"];
    _valueNodeID = config[@"value"];
  }
  return self;
}

- (id)evaluate:(REAEvalContext *)evalContext
{
  NSNumber *newValue = [[self.nodesManager findNodeByID:_valueNodeID] value:evalContext];
  REAValueNode *what = (REAValueNode *)[self.nodesManager findNodeByID:_whatNodeID];
  [what setValue:newValue withEvalContext:evalContext];
  return newValue;
}

@end
