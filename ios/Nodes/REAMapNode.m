#import "REAMapNode.h"
#import "REANodesManager.h"
#import "REAValueNode.h"

@implementation REAMapNode {
    NSArray *_argMapping;
}

- (instancetype)initWithID:(REANodeID)nodeID config:(NSDictionary<NSString *,id> *)config
{
    if ((self = [super initWithID:nodeID config:config])) {
        _argMapping = config[@"argMapping"];
    }
    return self;
}

- (void)setValue:(NSArray *)value
{
    // argMapping is an array of eventPaths, each even path ends with a target node ID
    for (NSArray *eventPath in _argMapping) {
        id mValue = value;
        NSLog(@"%@", mValue);
        for (NSUInteger i = 0; i < eventPath.count; i++) {
            if (i < eventPath.count - 1) {
                mValue = [mValue valueForKey:eventPath[i]];
            } else {
                REAValueNode *node = (REAValueNode *)[self.nodesManager findNodeByID:eventPath[i]];
                [node setValue:mValue];
            }
        }
    }
}

- (id)evaluate
{
    /*
    NSMutableArray *value = [NSMutableArray init];
    for (NSArray *eventPath in _argMapping) {
        for (NSUInteger i = 0; i < eventPath.count; i++) {
            if (i < eventPath.count - 1) {
                NSMutableArray *curr = [NSMutableArray ];
                [value setValue: forKeyPath:<#(nonnull NSString *)#>]
                val = [mValue valueForKey:eventPath[i]];
            } else {
                REAValueNode *node = (REAValueNode *)[self.nodesManager findNodeByID:eventPath[i]];
                [node setValue:mValue];
            }
        }
    }
     */
    return 0;
}

@end
