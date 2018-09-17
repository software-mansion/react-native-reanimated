#import "READebugNode.h"
#import "REANodesManager.h"
#import "REAModule.h"
#import "RCTDevSettings.h"

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

- (id)evaluate
{
  id value = [[self.nodesManager findNodeByID:_valueNodeID] value];
  RCTDevSettings *devSettings = [self.nodesManager.reanimatedModule.bridge valueForKey:@"devSettings"];
  BOOL isChromeDebugging = devSettings.isDebuggingRemotely;
  if (isChromeDebugging) {
    [self.nodesManager.reanimatedModule
    sendEventWithName:@"onDebugJS"
    body:@{@"id": self.nodeID, @"val": value }];
  } else {
    NSLog(@"%@ %@", _message, value);
  }
  return value;
}

@end
