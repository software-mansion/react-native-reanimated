

#import "REACallFuncNode.h"
#import "REAFunctionNode.h"
#import "REAParamNode.h"
#import "REANodesManager.h"

@implementation REACallFuncNode {
    NSNumber *_whatNodeID;
    NSArray<NSNumber *> *_args;
    NSArray<NSNumber *> *_params;
    NSMutableArray<NSNumber *> *_prevArgs;
}

- (instancetype)initWithID:(REANodeID)nodeID config:(NSDictionary<NSString *,id> *)config
{
    if ((self = [super initWithID:nodeID config:config])) {
        _whatNodeID = config[@"what"];
        _args = config[@"args"];
        _params = config[@"params"];
        _prevArgs = [NSMutableArray arrayWithCapacity:_args.count];
        for (NSUInteger i = 0; i < _params.count; i++) {
            _prevArgs[i] = [NSNumber numberWithInt:0];
        }
    }
    return self;
}

-(void) beginContext {
    for (NSUInteger i = 0; i < _params.count; i++) {
        NSNumber *paramID = [_params objectAtIndex:i];
        REAParamNode *param = (REAParamNode *)[self.nodesManager findNodeByID:paramID];
        _prevArgs[i] = [param value];
        [param setRefNode:_args[i]];
    }
}

-(void) endContext {
    for (NSUInteger i = 0; i < _params.count; i++) {
        NSNumber *paramID = [_params objectAtIndex:i];
        REAParamNode *param = (REAParamNode *)[self.nodesManager findNodeByID:paramID];
        [param setRefNode:_prevArgs[i]];
    }
}


- (id)evaluate
{
    [self beginContext];
    REAFunctionNode *what = (REAFunctionNode *)[self.nodesManager findNodeByID:_whatNodeID];
    NSNumber *newValue = [what evaluate];
    [self endContext];
    return newValue;
}

@end
