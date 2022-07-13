#import <RNReanimated/REACoreAnimationLayerProtocol.h>

@interface REACoreAnimationWrapper : NSObject <REACoreAnimationLayerProtocol, CAAnimationDelegate>

@property (nonatomic) CGFloat value;
@property (nonatomic) BOOL running;

- (instancetype)initWithAnimation:(nonnull CAPropertyAnimation *)animation
                        fromValue:(CGFloat)fromValue
                          toValue:(CGFloat)toValue;

@end
