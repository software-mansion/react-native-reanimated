
#import "REAFunctionNode.h"
#import "REAParamNode.h"
#import "REANodesManager.h"

@implementation REAFunctionNode {
    NSNumber *_nodeToBeEvaluated;
    NSArray<NSNumber *> *_params;
}

- (instancetype)initWithID:(REANodeID)nodeID config:(NSDictionary<NSString *,id> *)config
{
    if ((self = [super initWithID:nodeID config:config])) {
        _nodeToBeEvaluated = config[@"what"];
        _params = config[@"params"];
    }
    return self;
}

- (id)evaluate
{
    REANode *node = [self.nodesManager findNodeByID:_nodeToBeEvaluated];
    //NSLog(@"Calling function");
    id retVal = [node value];
    //NSLog(@"Returning %@", retVal);
    return retVal;
}

@end
