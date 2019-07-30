

#import "REACallFuncNode.h"
#import "REAFunctionNode.h"
#import "REAParamNode.h"
#import "REANodesManager.h"


@implementation REACallFuncNode {
    NSNumber *_whatNodeID;
    NSArray<NSNumber *> *_args;
    NSArray<NSNumber *> *_params;
    REANodeID _prevCallID;
}

- (instancetype)initWithID:(REANodeID)nodeID config:(NSDictionary<NSString *,id> *)config
{
    if ((self = [super initWithID:nodeID config:config])) {
        _whatNodeID = config[@"what"];
        _args = config[@"args"];
        _params = config[@"params"];
        _prevCallID = NULL;
    }
    return self;
}

-(void) beginContext {
    _prevCallID = self.updateContext.callID;
    self.updateContext.callID = self.nodeID;
    for (NSUInteger i = 0; i < _params.count; i++) {
        NSNumber *paramID = [_params objectAtIndex:i];
        REAParamNode *param = (REAParamNode *)[self.nodesManager findNodeByID:paramID];
        [param beginContext:_args[i]];
    }
}

-(void) endContext {
    for (NSUInteger i = 0; i < _params.count; i++) {
        NSNumber *paramID = [_params objectAtIndex:i];
        REAParamNode *param = (REAParamNode *)[self.nodesManager findNodeByID:paramID];
        [param endContext];
    }
    self.updateContext.callID = _prevCallID;
}

- (id)evaluate
{
   // NSLog(@"----> Begin call function");
    [self beginContext];
    REAFunctionNode *what = (REAFunctionNode *)[self.nodesManager findNodeByID:_whatNodeID];
    NSNumber *newValue = [what value];
    [self endContext];
    //NSLog(@"----> End call function");
    return newValue;
}

@end
