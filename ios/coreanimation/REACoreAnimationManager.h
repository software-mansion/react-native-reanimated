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

@interface REACoreAnimationManager : NSObject <TAProgressLayerProtocol, CAAnimationDelegate>

@property (nonatomic) CGFloat progress;
@property (nonatomic) BOOL active;

- (instancetype)init;
- (void)startFromValue:(float)fromValue toValue:(float)toValue;

@end
