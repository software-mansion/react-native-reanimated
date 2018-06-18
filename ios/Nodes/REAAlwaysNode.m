#import "REAAlwaysNode.h"
#import "REANodesManager.h"
#import "REAStyleNode.h"
#import "REAModule.h"
#import <React/RCTLog.h>
#import <React/RCTUIManager.h>

@implementation REAAlwaysNode
{
  NSNumber * _nodesToBeEvaluated;
}

- (instancetype)initWithID:(REANodeID)nodeID config:(NSDictionary<NSString *,id> *)config
{
    if ((self = [super initWithID:nodeID config:config])) {
        _nodesToBeEvaluated = config[@"what"];
    }
    return self;
}

- (id)value
{
  [[self.nodesManager findNodeByID:_nodesToBeEvaluated] value];
  return @(0);
}

- (void)update
{
  [self value];
}

@end

