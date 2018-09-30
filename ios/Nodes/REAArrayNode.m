#import "REAArrayNode.h"
#import "REANodesManager.h"

@implementation REAArrayNode {
    NSArray<REANode *> *_array;
}

- (instancetype)initWithID:(REANodeID)nodeID config:(NSDictionary<NSString *,id> *)config
{
    if ((self = [super initWithID:nodeID config:config])) {
        _array = config[@"array"];
    }
    return self;
}

- (id)evaluate
{
    NSMutableArray *result = [[NSMutableArray alloc] init];
    for (NSNumber *inputID in _array) {
        [result addObject: [[self.nodesManager findNodeByID:inputID] value]];
    }
    return result;
}

@end
