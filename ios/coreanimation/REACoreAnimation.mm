#import <Foundation/Foundation.h>
#import <RNReanimated/REACoreAnimation.h>
#import <RNReanimated/REACoreAnimationLayer.h>

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

- (void)valueDidChange:(CGFloat)value
{
  _value = value;
}

- (void)animationDidStop:(CAAnimation *)anim finished:(BOOL)flag
{
  _running = NO;
}

@end
