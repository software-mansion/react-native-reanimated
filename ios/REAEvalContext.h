#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>

@class REAPerformNode;
@class REANode;

@interface REAEvalContext : NSObject

- (instancetype)initWithParent:(REAPerformNode *) parent;

@property (nonatomic, nonnull) NSMutableArray< REANode * >  *updatedNodes;
@property (nonatomic) NSMutableDictionary<NSNumber *, id> *__strong memoizedValues;
@property (nonatomic) NSMutableDictionary<NSNumber *, NSNumber *> *__strong lastLoopIDs;
@property (nonatomic, nonnull) NSNumber *contextID;
@property (nonatomic) REAPerformNode *parent;

@end
