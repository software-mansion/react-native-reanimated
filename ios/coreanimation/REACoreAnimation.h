// CoreAnimation progress callback start
// source: https://newbedev.com/core-animation-progress-callback

@protocol TAProgressLayerProtocol <NSObject>

- (void)progressUpdatedTo:(CGFloat)progress;

@end

@interface TAProgressLayer : CALayer

@property CGFloat progress;
@property (weak) id<TAProgressLayerProtocol> delegate;

@end

// CoreAnimation progress callback end

@interface REACoreAnimation : NSObject <TAProgressLayerProtocol, CAAnimationDelegate>

@property (nonatomic) CGFloat progress;
@property (nonatomic) BOOL running;

- (instancetype)initWithFromValue:(float)fromValue toValue:(float)toValue;

@end
