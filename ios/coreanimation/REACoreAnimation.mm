#import <Foundation/Foundation.h>
#import <RNReanimated/REACoreAnimation.h>

// Adapted from https://newbedev.com/core-animation-progress-callback

@implementation REACoreAnimationLayer

// We must copy across our custom properties since Core Animation makes a copy
// of the layer that it's animating.

- (id)initWithLayer:(id)layer
{
  self = [super initWithLayer:layer];
  if (self) {
    REACoreAnimationLayer *otherLayer = (REACoreAnimationLayer *)layer;
    self.value = otherLayer.value;
    self.delegate = otherLayer.delegate;
  }
  return self;
}

// Override needsDisplayForKey so that we can define progress as being animatable.

+ (BOOL)needsDisplayForKey:(NSString *)key
{
  if ([key isEqualToString:@"value"]) {
    return YES;
  } else {
    return [super needsDisplayForKey:key];
  }
}

// Call our callback

- (void)drawInContext:(CGContextRef)ctx
{
  if (self.delegate) {
    [self.delegate valueDidChange:self.value];
  }
}

@end

// CoreAnimation progress callback end

@implementation REACoreAnimation {
  REACoreAnimationLayer *_layer;
}

- (instancetype)initWithFromValue:(float)fromValue toValue:(float)toValue
{
  self = [super init];

  _value = fromValue;
  _running = YES;

  _layer = [REACoreAnimationLayer layer];
  _layer.frame = CGRectMake(0, -1, 1, 1);
  _layer.delegate = self;

  UIWindow *keyWindow = [[[UIApplication sharedApplication] delegate] window];
  [keyWindow.layer addSublayer:_layer];

  CASpringAnimation *animation = [CASpringAnimation animationWithKeyPath:@"value"];
  animation.duration = animation.settlingDuration;
  animation.fromValue = @(fromValue);
  animation.toValue = @(toValue);
  // animation.removedOnCompletion = YES;
  animation.delegate = self;

  [_layer addAnimation:animation forKey:@"value"];
  _layer.value = toValue; // fixes zero progress issue for some number of final frames

  return self;
}

- (void)dealloc
{
  [_layer removeAnimationForKey:@"value"];
  [_layer removeFromSuperlayer];
}

- (void)valueDidUpdate:(CGFloat)value
{
  _value = value;
}

- (void)animationDidStop:(CAAnimation *)anim finished:(BOOL)flag
{
  _running = false;
}

@end
