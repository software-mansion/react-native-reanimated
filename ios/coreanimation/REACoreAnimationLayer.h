#import <RNReanimated/REACoreAnimationLayerProtocol.h>

@interface REACoreAnimationLayer : CALayer

@property CGFloat value;
@property (weak) id<REACoreAnimationLayerProtocol> delegate;

@end
