#import "REAAlwaysNode.h"
#import "REANodesManager.h"
#import "REAStyleNode.h"
#import "REAModule.h"
#import <React/RCTLog.h>
#import <React/RCTUIManager.h>

@implementation REAAlwaysNode
{
  NSNumber * _nodeToBeEvaluated;
}

- (instancetype)initWithID:(REANodeID)nodeID config:(NSDictionary<NSString *,id> *)config
{
    if ((self = [super initWithID:nodeID config:config])) {
        _nodeToBeEvaluated = config[@"what"];
    }
    return self;
}

- (id)evaluate:(REAEvalContext *)evalContext;
{
  [[self.nodesManager findNodeByID:_nodeToBeEvaluated] value:evalContext];
  return @(0);
}

- (void)update
{
  [self value:self.nodesManager.globalEvalContext];
}

@end

