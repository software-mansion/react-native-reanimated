#import "REANode.h"
#import "REANodesManager.h"
#import "REAValueNode.h"
#import "REAInvokeNode.h"
#import <React/RCTUIManager.h>
#import <React/RCTBridgeMethod.h>

@implementation REAInvokeNode
{
    NSString *_module;
    NSString *_method;
}

- (instancetype)initWithID:(REANodeID)nodeID config:(NSDictionary<NSString *,id> *)config
{
    if ((self = [super initWithID:nodeID config:config])) {
        _module = config[@"module"];
        _method = config[@"method"];
    }
    return self;
}

-(id)evaluate
{
    NSArray<id<RCTBridgeMethod>> *methods = [[self nodesManager] uiManager].methodsToExport;
    id<RCTBridgeMethod> m = [methods firstObject];
    RCTLog(@"what?? %@ %lu %s %@ %@", m, (unsigned long)m.functionType, m.JSMethodName, m.class, m.superclass);
    return @(0);
}

@end
