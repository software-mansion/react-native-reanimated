
#import "REAFunctionNode.h"
#import "REAParamNode.h"
#import "REANodesManager.h"

@implementation REAFunctionNode {
    NSNumber *_whatNodeID;
    NSArray<NSNumber *> *_params;
}

- (instancetype)initWithID:(REANodeID)nodeID config:(NSDictionary<NSString *,id> *)config
{
    if ((self = [super initWithID:nodeID config:config])) {
        _whatNodeID = config[@"what"];
        _params = config[@"params"];
    }
    return self;
}

- (id)evaluate
{
    REANode *node = [self.nodesManager findNodeByID:_whatNodeID];
    return [node evaluate];
}

@end
