#import "REAMapNode.h"
#import "REANodesManager.h"
#import "REAValueNode.h"

@implementation REACallbackNode {
    NSNumber _whatNodeID;
}

- (instancetype)initWithID:(REANodeID)nodeID config:(NSDictionary<NSString *,id> *)config
{
    if ((self = [super initWithID:nodeID config:config])) {
        _whatNodeID = config[@"what"];
    }
    return self;
}

- (RCTResponseSenderBlock)cb:(NSArray *response)
{
    [self setValue:response]
}

- (RCTResponseErrorBlock)cb:(NSError *error)
{
    NSLog(@"callback error");
}

- (RCTPromiseResolveBlock)cb:(id result)
{
    [self setValue:result]
}

- (RCTPromiseRejectBlock)cb:(NSString *code, NSString *message, NSError *error)
{
    NSLog(@"callback rejection");
}

@end
