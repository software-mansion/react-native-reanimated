#import "REANode.h"
#import "REANodesManager.h"
#import "REAValueNode.h"

@implementation REAInvokeNode {
    NSString _module;
    NSString _method;
}

- (instancetype)initWithID:(REANodeID)nodeID config:(NSDictionary<NSString *,id> *)config
{
    if ((self = [super initWithID:nodeID config:config])) {
        _module = config[@"module"];
        _method = config[@"method"];
    }
    return self;
}

@end
