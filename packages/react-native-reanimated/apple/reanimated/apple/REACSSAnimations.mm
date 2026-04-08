#import <reanimated/apple/REACSSAnimations.h>

#import <QuartzCore/QuartzCore.h>
#import <UIKit/UIKit.h>

// Animation direction is passed as integer enum values from C++.
// Order must match enums in CSSAnimationConfig.h:
//   AnimationDirection: Normal=0, Reverse=1, Alternate=2, AlternateReverse=3

#pragma mark - Direction Helpers

static BOOL isDirectionReversed(int direction)
{
  return direction == 1 /* Reverse */ || direction == 3 /* AlternateReverse */;
}

static BOOL isDirectionAlternating(int direction)
{
  return direction == 2 /* Alternate */ || direction == 3 /* AlternateReverse */;
}

#pragma mark - CA Value Conversion

// Maps CSS property names to CA layer key paths. Most are identical;
// only borderRadius differs (CA uses cornerRadius).
static NSString *getCAKeyPath(NSString *propertyName)
{
  if ([propertyName isEqualToString:@"borderRadius"]) {
    return @"cornerRadius";
  }
  return propertyName;
}

// Easing is either an array of 4 cubic bezier control points [x1, y1, x2, y2]
// or nil/NSNull for linear. All predefined CSS easings (ease, ease-in, etc.)
// are resolved to their bezier control points on the C++ side.
static CAMediaTimingFunction *getCATimingFunction(id easing)
{
  if ([easing isKindOfClass:[NSArray class]]) {
    NSArray *points = (NSArray *)easing;
    if (points.count == 4) {
      return [CAMediaTimingFunction functionWithControlPoints:
                                       [points[0] floatValue] :
                                       [points[1] floatValue] :
                                       [points[2] floatValue] :
                                       [points[3] floatValue]];
    }
  }
  return [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionLinear];
}

static id getCAValue(NSString *keyPath, id rawValue)
{
  if ([keyPath isEqualToString:@"transform"]) {
    NSArray *arr = (NSArray *)rawValue;
    CATransform3D t;
    t.m11 = [arr[0] doubleValue];
    t.m12 = [arr[1] doubleValue];
    t.m13 = [arr[2] doubleValue];
    t.m14 = [arr[3] doubleValue];
    t.m21 = [arr[4] doubleValue];
    t.m22 = [arr[5] doubleValue];
    t.m23 = [arr[6] doubleValue];
    t.m24 = [arr[7] doubleValue];
    t.m31 = [arr[8] doubleValue];
    t.m32 = [arr[9] doubleValue];
    t.m33 = [arr[10] doubleValue];
    t.m34 = [arr[11] doubleValue];
    t.m41 = [arr[12] doubleValue];
    t.m42 = [arr[13] doubleValue];
    t.m43 = [arr[14] doubleValue];
    t.m44 = [arr[15] doubleValue];
    return [NSValue valueWithCATransform3D:t];
  }

  if ([keyPath hasSuffix:@"Color"]) {
    NSArray *arr = (NSArray *)rawValue;
    CGFloat r = [arr[0] doubleValue] / 255.0;
    CGFloat g = [arr[1] doubleValue] / 255.0;
    CGFloat b = [arr[2] doubleValue] / 255.0;
    CGFloat a = [arr[3] doubleValue] / 255.0;
    return (__bridge id)[UIColor colorWithRed:r green:g blue:b alpha:a].CGColor;
  }

  if ([keyPath isEqualToString:@"shadowOffset"]) {
    NSArray *arr = (NSArray *)rawValue;
    CGSize size = CGSizeMake([arr[0] doubleValue], [arr[1] doubleValue]);
    return [NSValue valueWithCGSize:size];
  }

  // NSNumber for opacity, cornerRadius, shadowOpacity, shadowRadius, etc.
  return rawValue;
}

#pragma mark - CA Animation Building

typedef struct {
  NSArray *values;
  NSArray *keyTimes;
} CAKeyframeData;

static CAKeyframeData extractKeyframeValues(NSString *keyPath, NSArray *keyframes, BOOL isReversed)
{
  NSMutableArray *values = [NSMutableArray arrayWithCapacity:keyframes.count];
  NSMutableArray *keyTimes = [NSMutableArray arrayWithCapacity:keyframes.count];

  if (isReversed) {
    for (NSInteger i = keyframes.count - 1; i >= 0; i--) {
      NSDictionary *kf = keyframes[i];
      [values addObject:getCAValue(keyPath, kf[@"value"])];
      [keyTimes addObject:@(1.0 - [kf[@"offset"] doubleValue])];
    }
  } else {
    for (NSDictionary *kf in keyframes) {
      [values addObject:getCAValue(keyPath, kf[@"value"])];
      [keyTimes addObject:kf[@"offset"]];
    }
  }

  return (CAKeyframeData){values, keyTimes};
}

static CAAnimation *createAnimationFromKeyframes(
    NSString *keyPath,
    CAKeyframeData keyframeData,
    NSArray *easings,
    BOOL isReversed)
{
  if (keyframeData.values.count == 2) {
    CABasicAnimation *basic = [CABasicAnimation animationWithKeyPath:keyPath];
    basic.fromValue = keyframeData.values[0];
    basic.toValue = keyframeData.values[1];
    if (easings.count > 0) {
      basic.timingFunction = getCATimingFunction(easings[0]);
    }
    return basic;
  }

  CAKeyframeAnimation *kfAnim = [CAKeyframeAnimation animationWithKeyPath:keyPath];
  kfAnim.values = keyframeData.values;
  kfAnim.keyTimes = keyframeData.keyTimes;
  if (easings.count > 0) {
    NSMutableArray *timingFunctions = [NSMutableArray array];
    NSArray *easingsToUse = isReversed ? [[easings reverseObjectEnumerator] allObjects] : easings;
    for (id easing in easingsToUse) {
      [timingFunctions addObject:getCATimingFunction(easing)];
    }
    kfAnim.timingFunctions = timingFunctions;
  }
  return kfAnim;
}


// Delay and fill mode are handled by C++ for cross-platform consistency.
// CA animations start immediately and are always removed on completion.
static void configureAnimationTiming(CAAnimation *animation, NSDictionary *settings)
{
  double duration = [settings[@"duration"] doubleValue] / 1000.0;
  double iterationCount = [settings[@"iterationCount"] doubleValue];
  BOOL isAlternating = isDirectionAlternating([settings[@"direction"] intValue]);

  animation.duration = duration;

  if (iterationCount == -1) {
    animation.repeatCount = HUGE_VALF;
    if (isAlternating) {
      animation.autoreverses = YES;
    }
  } else if (isAlternating && iterationCount >= 2) {
    // Use autoreverses only for 2+ iterations to avoid CA adding
    // an unwanted reverse pass for single-iteration animations.
    // Each CA "cycle" with autoreverses = forward + reverse -> 2 CSS iterations.
    animation.autoreverses = YES;
    animation.repeatCount = (float)((iterationCount / 2.0) - 1);
  } else if (iterationCount > 1) {
    animation.repeatCount = (float)(iterationCount - 1);
  }
}

static CAAnimation *buildCAAnimation(NSDictionary *descriptor, NSDictionary *settings)
{
  NSString *keyPath = getCAKeyPath(descriptor[@"keyPath"]);
  BOOL isReversed = isDirectionReversed([settings[@"direction"] intValue]);

  CAKeyframeData keyframeData =
      extractKeyframeValues(keyPath, descriptor[@"keyframes"], isReversed);

  CAAnimation *animation =
      createAnimationFromKeyframes(keyPath, keyframeData, descriptor[@"easings"], isReversed);

  configureAnimationTiming(animation, settings);

  return animation;
}

#pragma mark - REACSSAnimations

// Declarative platform animation API.
//
// The C++ side calls applyAnimations with the full ordered list of animation
// names and a diff (updates) containing only changed animations.
// This single method handles additions, removals, and updates.
//
// Animation key strategy:
// We use "animationName-keyPath" (e.g. "fadeIn-opacity") as the CA animation
// key. This allows multiple CSS animations to target the same property
// simultaneously. Per CSS spec, later animations in the animation-name list
// have higher priority - their values visually override earlier ones. However,
// if the higher-priority animation finishes first, the lower-priority one
// (which kept running) becomes visible again for its remaining duration.
// For non-additive animations (the default), CA gives visual priority to the
// last-added animation, matching CSS semantics when we add them in list order.

@implementation REACSSAnimations {
  // Tracks animated property keyPaths per view, grouped by CSS animation name.
  // viewTag -> { animationName -> [keyPath, ...] }
  NSMutableDictionary<NSNumber *, NSMutableDictionary<NSString *, NSMutableArray<NSString *> *> *>
      *_animationKeyPaths;
}

- (instancetype)init
{
  if (self = [super init]) {
    _animationKeyPaths = [NSMutableDictionary new];
  }
  return self;
}

- (void)applyDescriptor:(NSDictionary *)descriptor
           animationKey:(NSString *)animationKey
               settings:(NSDictionary *)settings
                toLayer:(CALayer *)layer
{
  CAAnimation *existing = [layer animationForKey:animationKey];
  CAAnimation *animation = buildCAAnimation(descriptor, settings);

  if (existing) {
    // Update existing: preserve progress by offsetting beginTime.
    CFTimeInterval elapsed =
        [layer convertTime:CACurrentMediaTime() fromLayer:nil] - existing.beginTime;
    [layer removeAnimationForKey:animationKey];
    animation.beginTime = CACurrentMediaTime() - elapsed;
  }

  [layer addAnimation:animation forKey:animationKey];
}

- (void)removeStaleAnimationsFromLayer:(CALayer *)layer
                               viewKey:(NSNumber *)viewKey
                          orderedNames:(NSSet<NSString *> *)orderedNamesSet
{
  NSMutableDictionary *viewAnimKeyPaths = _animationKeyPaths[viewKey];
  if (!viewAnimKeyPaths) {
    return;
  }

  for (NSString *animName in [viewAnimKeyPaths allKeys]) {
    if (![orderedNamesSet containsObject:animName]) {
      for (NSString *keyPath in viewAnimKeyPaths[animName]) {
        [layer removeAnimationForKey:[NSString stringWithFormat:@"%@-%@", animName, keyPath]];
      }
      [viewAnimKeyPaths removeObjectForKey:animName];
    }
  }
}

- (void)applyCSSAnimationsForView:(REAUIView *)view animations:(NSArray *)animations
{
  CALayer *layer = view.layer;
  NSNumber *viewKey = @(view.tag);

  NSMutableSet *currentNames = [NSMutableSet setWithCapacity:animations.count];
  for (NSDictionary *anim in animations) {
    [currentNames addObject:anim[@"name"]];
  }

  if (!_animationKeyPaths[viewKey]) {
    _animationKeyPaths[viewKey] = [NSMutableDictionary new];
  }

  [self removeStaleAnimationsFromLayer:layer viewKey:viewKey orderedNames:currentNames];

  for (NSDictionary *anim in animations) {
    NSString *animName = anim[@"name"];
    NSArray *descriptors = anim[@"descriptors"];
    NSDictionary *settings = anim[@"settings"];

    NSMutableArray *keyPaths = [NSMutableArray arrayWithCapacity:descriptors.count];
    for (NSDictionary *descriptor in descriptors) {
      NSString *keyPath = descriptor[@"keyPath"];
      [keyPaths addObject:keyPath];

      [self applyDescriptor:descriptor
               animationKey:[NSString stringWithFormat:@"%@-%@", animName, keyPath]
                   settings:settings
                    toLayer:layer];
    }

    _animationKeyPaths[viewKey][animName] = keyPaths;
  }

  if (_animationKeyPaths[viewKey].count == 0) {
    [_animationKeyPaths removeObjectForKey:viewKey];
  }
}

- (void)removeAllAnimationsForView:(REAUIView *)view
{
  [self removeStaleAnimationsFromLayer:view.layer viewKey:@(view.tag) orderedNames:[NSSet set]];
}

@end
