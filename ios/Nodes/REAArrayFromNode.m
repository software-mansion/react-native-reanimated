#import "REAArrayFromNode.h"
#import "REANodesManager.h"

@implementation REAArrayFromNode {
    NSArray<REANode *> *_arrayFrom;
}

- (instancetype)initWithID:(REANodeID)nodeID config:(NSDictionary<NSString *,id> *)config
{
    if ((self = [super initWithID:nodeID config:config])) {
        _arrayFrom = config[@"arrayFrom"];
    }
    return self;
}

- (id)evaluate
{
    NSMutableArray *result = [[NSMutableArray alloc] init];
    for (NSNumber *inputID in _arrayFrom) {
        [result addObject: [[self.nodesManager findNodeByID:inputID] value]];
    }
    return result;
}

@end
