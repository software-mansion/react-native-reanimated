#import <Foundation/Foundation.h>
#import <RNReanimated/REACoreAnimationSpring.h>

// CoreAnimation progress callback start
// source: https://newbedev.com/core-animation-progress-callback

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

@implementation REACoreAnimationSpring {
  TAProgressLayer *_progressLayer;
}

- (instancetype)initWithFromValue:(float)fromValue toValue:(float)toValue
{
  self = [super init];

  _progress = fromValue;
  _running = YES;

  _progressLayer = [TAProgressLayer layer];
  _progressLayer.frame = CGRectMake(0, -1, 1, 1);
  _progressLayer.delegate = self;

  UIWindow *keyWindow = [[[UIApplication sharedApplication] delegate] window];
  [keyWindow.layer addSublayer:_progressLayer];

  CASpringAnimation *animation = [CASpringAnimation animationWithKeyPath:@"progress"];
  animation.duration = animation.settlingDuration;
  animation.fromValue = @(fromValue);
  animation.toValue = @(toValue);
  // animation.removedOnCompletion = YES;
  animation.delegate = self;

  [_progressLayer addAnimation:animation forKey:@"progress"];
  _progressLayer.progress = toValue; // fixes zero progress issue for some number of final frames

  return self;
}

- (void)dealloc
{
  [_progressLayer removeAnimationForKey:@"progress"];
  [_progressLayer removeFromSuperlayer];
}

- (void)progressUpdatedTo:(CGFloat)progress
{
  _progress = progress;
}

- (void)animationDidStop:(CAAnimation *)anim finished:(BOOL)flag
{
  _running = false;
}

@end
