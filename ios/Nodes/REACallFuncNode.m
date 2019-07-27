

#import "REACallFuncNode.h"
#import "REAFunctionNode.h"
#import "REAParamNode.h"
#import "REANodesManager.h"

@interface REAUpdateContext ()

@property (nonatomic) NSUInteger updateCount;

@end

@implementation REACallFuncNode {
    NSNumber *_whatNodeID;
    NSArray<NSNumber *> *_args;
    NSArray<NSNumber *> *_params;
}

- (instancetype)initWithID:(REANodeID)nodeID config:(NSDictionary<NSString *,id> *)config
{
    if ((self = [super initWithID:nodeID config:config])) {
        _whatNodeID = config[@"what"];
        _args = config[@"args"];
        _params = config[@"params"];
    }
    return self;
}

-(void) beginContext {
    self.updateContext.updateCount++;
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
    self.updateContext.updateCount--;
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
