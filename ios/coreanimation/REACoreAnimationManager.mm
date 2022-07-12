#import <Foundation/Foundation.h>
#import <RNReanimated/REACoreAnimationManager.h>

// CoreAnimation progress callback start
// source: https://newbedev.com/core-animation-progress-callback

@protocol TAProgressLayerProtocol <NSObject>

- (void)progressUpdatedTo:(CGFloat)progress;

@end

@interface TAProgressLayer : CALayer

@property CGFloat progress;
@property (weak) id<TAProgressLayerProtocol> delegate;

@end

@implementation TAProgressLayer

// We must copy across our custom properties since Core Animation makes a copy
// of the layer that it's animating.

- (id)initWithLayer:(id)layer
{
  self = [super initWithLayer:layer];
  if (self) {
    TAProgressLayer *otherLayer = (TAProgressLayer *)layer;
    self.progress = otherLayer.progress;
    self.delegate = otherLayer.delegate;
  }
  return self;
}

// Override needsDisplayForKey so that we can define progress as being animatable.

+ (BOOL)needsDisplayForKey:(NSString *)key
{
  if ([key isEqualToString:@"progress"]) {
    return YES;
  } else {
    return [super needsDisplayForKey:key];
  }
}

// Call our callback

- (void)drawInContext:(CGContextRef)ctx
{
  if (self.delegate) {
    [self.delegate progressUpdatedTo:self.progress];
  }
}

@end

// CoreAnimation progress callback end

@implementation REACoreAnimationManager

- (instancetype)init
{
  self = [super init];
  return self;
}

- (void)start
{
  static bool started = false;
  if (started) {
    return;
  }
  started = true;

  TAProgressLayer *progressLayer = [TAProgressLayer layer];
  progressLayer.frame = CGRectMake(0, -1, 1, 1);
  progressLayer.delegate = self;
  UIWindow *keyWindow = [[[UIApplication sharedApplication] delegate] window];
  [keyWindow.layer addSublayer:progressLayer];

  CASpringAnimation *animation = [CASpringAnimation animationWithKeyPath:@"progress"];
  animation.duration = animation.settlingDuration;
  animation.fromValue = @0;
  animation.toValue = @90;
  animation.removedOnCompletion = YES;

  [progressLayer addAnimation:animation forKey:@"progress"];
  progressLayer.progress = 90; // fixes zero progress issue for some number of final frames
}

- (void)progressUpdatedTo:(CGFloat)progress
{
  _progress = progress;
}

@end
