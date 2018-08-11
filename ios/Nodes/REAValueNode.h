#import <UIKit/UIKit.h>

#import "REANode.h"

@class REAValueNode;

@interface REAValueNode : REANode

- (void)setValue:(NSNumber *)value
 withEvalContext:(REAEvalContext *)evalContext;

@end
