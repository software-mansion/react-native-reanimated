#import <Foundation/Foundation.h>
#import <RNReanimated/REACoreAnimationLayer.h>

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
