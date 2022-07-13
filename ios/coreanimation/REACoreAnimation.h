#import <RNReanimated/REACoreAnimationLayerProtocol.h>

@interface REACoreAnimation : NSObject <REACoreAnimationLayerProtocol, CAAnimationDelegate>

@property (nonatomic) CGFloat value;
@property (nonatomic) BOOL running;

- (instancetype)initWithFromValue:(float)fromValue toValue:(float)toValue;

@end
