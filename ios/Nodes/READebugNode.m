#import "READebugNode.h"
#import "REANodesManager.h"
#import <React/RCTConvert.h>

@implementation READebugNode {
  NSNumber *_valueNodeID;
  NSString *_message;
}

- (instancetype)initWithID:(REANodeID)nodeID config:(NSDictionary<NSString *,id> *)config
{
  if ((self = [super initWithID:nodeID config:config])) {
    _message = [RCTConvert NSString:config[@"message"]];
    _valueNodeID = [RCTConvert NSNumber:config[@"value"]];
    if (_valueNodeID == nil) {
      RCTLogError(
        @"Reanimated: Second argument passed to debug node is either of wrong type or is missing. NodeID: %@",
        self.nodeID
      );
    }
  }
  return self;
}

- (id)evaluate
{
  id value = [[self.nodesManager findNodeByID:_valueNodeID] value];
  NSLog(@"%@ %@", _message, value);
  return value;
}

@end
