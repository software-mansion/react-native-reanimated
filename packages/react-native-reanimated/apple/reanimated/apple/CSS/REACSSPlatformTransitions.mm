#import <reanimated/apple/CSS/REACSSPlatformTransitions.h>

#import <reanimated/apple/CSS/REACSSPlatformProps.h>
#import <reanimated/apple/REASlowAnimations.h>
#import <reanimated/apple/REAUIView.h>

#import <React/RCTComponentViewProtocol.h>
#import <React/RCTComponentViewRegistry.h>
#import <React/RCTMountingManager.h>
#import <React/RCTSurfacePresenter.h>
#import <React/RCTUtils.h>

#import <QuartzCore/QuartzCore.h>

#import <string>

using namespace facebook;
using namespace facebook::react;
using namespace reanimated::css;

static NSString *const REAViewTagAnimationKey = @"reanimatedViewTag";

static BOOL isAnimationOfView(CAAnimation *_Nullable animation, Tag viewTag)
{
  return [[animation valueForKey:REAViewTagAnimationKey] isEqual:@(viewTag)];
}

@implementation REACSSPlatformTransitions {
  __weak RCTSurfacePresenter *_surfacePresenter;
  // React Native can recycle a view before its transitions stop, so the layer of a tag
  // can belong to a different tag later. Only the main thread uses these maps.
  NSMapTable<NSNumber *, CALayer *> *_layersByTag;
  NSMapTable<CALayer *, NSNumber *> *_tagsByLayer;
}

- (instancetype)initWithSurfacePresenter:(RCTSurfacePresenter *)surfacePresenter
{
  if (self = [super init]) {
    _surfacePresenter = surfacePresenter;
    _layersByTag = [NSMapTable strongToWeakObjectsMapTable];
    _tagsByLayer = [NSMapTable weakToStrongObjectsMapTable];
  }
  return self;
}

- (nullable CALayer *)layerForTag:(Tag)viewTag
{
  REAUIView<RCTComponentViewProtocol> *view =
      [_surfacePresenter.mountingManager.componentViewRegistry findComponentViewWithTag:viewTag];
  return view.layer;
}

- (BOOL)startTransitionForTag:(Tag)viewTag
                 propertyName:(const std::string &)propertyName
                    fromValue:(const PlatformValue &)fromValue
                      toValue:(const PlatformValue &)toValue
                   durationMs:(double)durationMs
             startTimestampMs:(double)startTimestampMs
                       easing:(const EasingConfig &)easing
                   persistent:(BOOL)persistent
{
  // Capture everything up front; CALayer access must happen on the main thread.
  NSString *keyPath = caLayerKeyPathForCSSProperty(propertyName);
  id fromId = idFromPlatformValue(fromValue);
  id toId = idFromPlatformValue(toValue);
  double durationSec = reanimated::calculateMediaDurationFromSlowAnimationsDuration(durationMs / 1000.0);
  CFTimeInterval beginTime = reanimated::calculateMediaTimeFromSlowAnimationsTimestamp(startTimestampMs / 1000.0);
  CAMediaTimingFunction *timing = makeCSSTimingFunction(easing);

  __weak __typeof__(self) weakSelf = self;
  RCTExecuteOnMainQueue(^{
    __typeof__(self) strongSelf = weakSelf;
    if (strongSelf == nil) {
      return;
    }
    CALayer *layer = [strongSelf layerForTag:viewTag];
    if (!layer) {
      return;
    }
    [strongSelf assignLayer:layer toTag:viewTag];

    CABasicAnimation *anim = [CABasicAnimation animationWithKeyPath:keyPath];
    // On interruption, continue from the live presentation value, falling back to the
    // model - never to fromId, which would snap a quick tap to the settled pseudo target.
    CAAnimation *runningAnimation = [layer animationForKey:keyPath];
    if ([runningAnimation isKindOfClass:[CABasicAnimation class]] && isAnimationOfView(runningAnimation, viewTag)) {
      id presentationValue = [[layer presentationLayer] valueForKeyPath:keyPath];
      anim.fromValue = presentationValue ?: [layer valueForKeyPath:keyPath];
    } else {
      anim.fromValue = fromId;
    }
    [anim setValue:@(viewTag) forKey:REAViewTagAnimationKey];
    anim.toValue = toId;
    anim.duration = durationSec;
    // beginTime is in the layer's local clock; converting keeps ancestor
    // speed/timeOffset (e.g. RN Screens during navigation) from shifting it.
    anim.beginTime = [layer convertTime:beginTime fromLayer:nil];
    anim.timingFunction = timing;
    anim.fillMode = persistent ? kCAFillModeBoth : kCAFillModeBackwards;
    anim.removedOnCompletion = persistent ? NO : YES;

    // Non-persistent transitions commit toValue to the model so the layer settles there on
    // self-removal; persistent (pseudo) ones hold their value via fillMode and keep the base model.
    [CATransaction begin];
    [CATransaction setDisableActions:YES];
    if (!persistent) {
      [layer setValue:toId forKeyPath:keyPath];
    }
    [layer addAnimation:anim forKey:keyPath];
    [CATransaction commit];
  });

  return YES;
}

- (void)stopTransitionForTag:(Tag)viewTag propertyName:(const std::string &)propertyName
{
  NSString *keyPath = caLayerKeyPathForCSSProperty(propertyName);
  __weak __typeof__(self) weakSelf = self;
  RCTExecuteOnMainQueue(^{
    __typeof__(self) strongSelf = weakSelf;
    if (strongSelf == nil) {
      return;
    }
    CALayer *layer = [strongSelf layerForTag:viewTag];
    if (layer) {
      if (isAnimationOfView([layer animationForKey:keyPath], viewTag)) {
        // Freeze the last visible frame into the model so the layer doesn't snap.
        id presentationValue = [[layer presentationLayer] valueForKeyPath:keyPath];
        if (presentationValue) {
          [layer setValue:presentationValue forKeyPath:keyPath];
        }
        [layer removeAnimationForKey:keyPath];
      }
    } else {
      // The view left the registry. React Native sets the props of a recycled view
      // again, so only the animation is removed.
      layer = [strongSelf->_layersByTag objectForKey:@(viewTag)];
      if (isAnimationOfView([layer animationForKey:keyPath], viewTag)) {
        [layer removeAnimationForKey:keyPath];
      }
    }
    [strongSelf forgetLayer:layer ifIdleForTag:viewTag];
  });
}

- (void)assignLayer:(CALayer *)layer toTag:(Tag)viewTag
{
  NSNumber *previousTag = [_tagsByLayer objectForKey:layer];
  if (previousTag != nil && previousTag.intValue != viewTag) {
    for (NSString *key in layer.animationKeys) {
      if (isAnimationOfView([layer animationForKey:key], previousTag.intValue)) {
        [layer removeAnimationForKey:key];
      }
    }
    [_layersByTag removeObjectForKey:previousTag];
  }
  [_layersByTag setObject:layer forKey:@(viewTag)];
  [_tagsByLayer setObject:@(viewTag) forKey:layer];
}

- (void)forgetLayer:(nullable CALayer *)layer ifIdleForTag:(Tag)viewTag
{
  for (NSString *key in layer.animationKeys) {
    if (isAnimationOfView([layer animationForKey:key], viewTag)) {
      return;
    }
  }
  [_layersByTag removeObjectForKey:@(viewTag)];
  if ([[_tagsByLayer objectForKey:layer] isEqual:@(viewTag)]) {
    [_tagsByLayer removeObjectForKey:layer];
  }
}

@end
