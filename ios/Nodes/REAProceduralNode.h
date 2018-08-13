#import "REANode.h"
#import "REAValueNode.h"

@interface REAProceduralNode : REANode

@property (nonatomic) NSArray<NSNumber *> *proceduralArguments;

@end


@interface REAPerformNode : REANode

@end


@interface REAArgumentNode : REAValueNode

- (void)matchContextWithNode:(REAEvalContext *) evalContext
                    withNode:(REANode *) node;
- (void)matchNodeWithOldContext:(REANode *) node
                    withContext:(REAEvalContext *) evalContext;
- (void)dropContext:(REAEvalContext *)evalContext;

@end
