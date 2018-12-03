#import "REANode.h"
#import "REAValueNode.h"

@interface REAProceduralNode : REANode

@property (nonatomic) NSArray<NSNumber *> *proceduralArguments;

@end


@interface REAPerformNode : REANode
- (void)onDrop;

@end


@interface REAArgumentNode : REAValueNode
- (REAEvalContext *)contextForUpdatingChildren:(REAEvalContext *)currentContext
                           withLastVisitedNode:(REANode *)lastVisited;

@end
