#import "REAParamNode.h"
#import "REAValueNode.h"
#import "REANodesManager.h"

@implementation REAParamNode {
    NSString *_name;
    NSNumber *_refNode;
    NSMutableArray *_stack;
}

- (instancetype)initWithID:(REANodeID)nodeID config:(NSDictionary<NSString *,id> *)config
{
    if ((self = [super initWithID:nodeID config:config])) {
        _name = config[@"name"];
        _stack = [NSMutableArray arrayWithCapacity:0];
    }
    return self;
}

-(void) setValue:(NSNumber *)value {
    REANode *node = [self.nodesManager findNodeByID:_refNode];
    if([node respondsToSelector:@selector(setValue:)]) {
        [(REAValueNode*)node setValue:value];
    }
}

-(void) beginContext:(NSNumber*) ref {
    _refNode = ref;
    REANode *node = [self.nodesManager findNodeByID:_refNode];
    if(node) {
        [_stack addObject:[node evaluate]];
        //NSLog(@"Updating param %@ with value %@", _name, [_stack lastObject]);
    } else {
        [_stack addObject: [NSNumber numberWithInt:0]];
    }
    
    [self forceUpdateMemoizedValue:[_stack lastObject]];
}

-(void) endContext {
    [_stack removeLastObject];
    [self forceUpdateMemoizedValue:[_stack lastObject]];
}


-(id) evaluate {
    return [_stack lastObject];
}


@end
