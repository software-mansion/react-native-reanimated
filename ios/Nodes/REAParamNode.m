#import "REAParamNode.h"
#import "REAValueNode.h"
#import "REANodesManager.h"

@implementation REAParamNode {
    NSString *_name;
    NSNumber *_refNode;
}

- (instancetype)initWithID:(REANodeID)nodeID config:(NSDictionary<NSString *,id> *)config
{
    if ((self = [super initWithID:nodeID config:config])) {
        _name = config[@"name"];
    }
    return self;
}

-(void) setRefNode:(NSNumber*) ref {
    _refNode = ref;    
}

-(id) value {
    REANode *node = [self.nodesManager findNodeByID:_refNode];
    if(node) {
        return [node value];
    }
    return [NSNumber numberWithInt:0];
}


@end
