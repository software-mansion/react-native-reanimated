#import "READebugNode.h"
#import "REANodesManager.h"

@implementation READebugNode {
  NSNumber *_valueNodeID;
  NSString *_message;
}

- (instancetype)initWithID:(REANodeID)nodeID config:(NSDictionary<NSString *,id> *)config
{
  if ((self = [super initWithID:nodeID config:config])) {
    _message = config[@"message"];
    _valueNodeID = config[@"value"];
  }
  return self;
}

- (id)evaluate:(REAEvalContext *)evalContext
{
  id value = [[self.nodesManager findNodeByID:_valueNodeID] value:evalContext];
  NSLog(@"%@ %@", _message, value);
  return value;
}

@end
