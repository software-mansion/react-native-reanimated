#import "REAValueNode.h"
#import "REANodesManager.h"
#import "REAModule.h"

@implementation REAValueNode {
  NSNumber *_value;
}

- (instancetype)initWithID:(REANodeID)nodeID
                    config:(NSDictionary<NSString *, id> *)config
{
    if (self = [super initWithID:nodeID config:config]) {
        _value = config[@"value"];
    }
    return self;
}

- (void)setValue:(NSNumber *)value
{
  _value = value;
  [self forceUpdateMemoizedValue:value];
}

- (id)evaluate
{
  return _value;
}

- (void)drop
{
  NSObject *value = self.value;
  if (!value) {
    value = [NSNull null];
  }

  [self.nodesManager.reanimatedModule
   sendEventWithName:@"onReanimatedValueDropped"
   body:@{@"id": self.nodeID, @"value": value }];
}

@end

