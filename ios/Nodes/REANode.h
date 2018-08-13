#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import "REAEvalContext.h"

@class REANodesManager;

typedef NSNumber* REANodeID;

@protocol REAFinalNode

- (void)update;

@end


@interface REANode : NSObject

+ (void)runPropUpdates:(nonnull REANodesManager *)nodesManager;

- (instancetype)initWithID:(REANodeID)nodeID
                    config:(NSDictionary<NSString *, id> *)config NS_DESIGNATED_INITIALIZER;

@property (nonatomic, weak, nullable) REANodesManager *nodesManager;
@property (nonatomic, readonly, nonnull) REANodeID nodeID;
@property (nonatomic, nullable) NSMutableArray<REANode *> *childNodes;

- (_Nullable id)evaluate:(REAEvalContext *)evalContext;
- (_Nullable id)value:(REAEvalContext *)evalContext;
- (void)markUpdated:(REAEvalContext *)evalContext;
- (void)onDrop;
- (REAEvalContext *)switchContextWhileUpdatingIfNeeded:(REAEvalContext *)evalContext
                                   withLastVisitedNode:(REANode *) lastVisited;

- (void)addChild:(REANode *)child NS_REQUIRES_SUPER;
- (void)removeChild:(REANode *)child NS_REQUIRES_SUPER;
- (NSMutableArray *)getChildenByContext:(REAEvalContext *) evalContext;

- (void)dangerouslyRescheduleEvaluate:(REAEvalContext *)evalContext;
- (void)forceUpdateMemoizedValue:(id)value
                 withEvalContext:(REAEvalContext *)evalContext;

@end
