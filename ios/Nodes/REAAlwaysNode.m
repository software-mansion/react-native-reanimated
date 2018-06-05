#import "REAAlwaysNode.h"
#import "REANodesManager.h"
#import "REAStyleNode.h"
#import "REAModule.h"
#import <React/RCTLog.h>
#import <React/RCTUIManager.h>

@implementation REAAlwaysNode
{
  NSNumber * _nodeToBeValued;
}

- (instancetype)initWithID:(REANodeID)nodeID config:(NSDictionary<NSString *,id> *)config
{
    if ((self = [super initWithID:nodeID config:config])) {
        _nodeToBeValued = config[@"what"];
    }
    return self;
}

- (id)evaluate
{
  return @(0);
}

- (void)update
{
  [[self.nodesManager findNodeByID:_nodeToBeValued] value];
}

@end

