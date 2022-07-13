// CoreAnimation progress callback start
// source: https://newbedev.com/core-animation-progress-callback

@protocol REACoreAnimationLayerProtocol <NSObject>

- (void)valueDidChange:(CGFloat)value;

@end

@interface REACoreAnimationLayer : CALayer

@property CGFloat value;
@property (weak) id<REACoreAnimationLayerProtocol> delegate;

@end

// CoreAnimation progress callback end

@interface REACoreAnimation : NSObject <REACoreAnimationLayerProtocol, CAAnimationDelegate>

@property (nonatomic) CGFloat value;
@property (nonatomic) BOOL running;

- (instancetype)initWithFromValue:(float)fromValue toValue:(float)toValue;

@end
