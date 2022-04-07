#import <UIKit/UIKit.h>

#import <RNReanimated/REANode.h>

@class REAValueNode;

@interface REAValueNode : REANode

- (void)setValue:(NSNumber *)value;

@end
