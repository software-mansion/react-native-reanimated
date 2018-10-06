#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>

@class REAPerformNode;
@class REANode;

// REANodeLoopWrapper has been created in order to
// store loopID in map without using NSNumber
@interface REANodeLoopWrapper : NSObject

@property (nonatomic) NSInteger ID;

@end


@interface REAEvalContext : NSObject

- (instancetype)initWithParent:(REAPerformNode *) parent;

@property (nonatomic, nonnull) NSMutableArray< REANode * >  *updatedNodes;
@property (nonatomic) NSMutableDictionary<NSNumber *, id> *__strong memoizedValues;
@property (nonatomic) NSMutableDictionary<NSNumber *, REANodeLoopWrapper *> *__strong lastLoops;
@property (nonatomic, nonnull) NSNumber *contextID;
@property (nonatomic) REAPerformNode *parent;

@end
