#import <Foundation/Foundation.h>

@class REANodesManager;

@interface REAFrameEvaluation : NSObject
- (instancetype)initWithNodesManager:(REANodesManager *)nodesManager;
- (void)runPropUpdates;

@end
