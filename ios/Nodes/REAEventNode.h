#import "REAMapNode.h"

#import <React/RCTEventDispatcher.h>

@interface REAEventNode : REAMapNode

- (void)processEvent:(id<RCTEvent>)event;

@end
