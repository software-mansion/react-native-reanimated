#import <reanimated/apple/CSS/REACSSPlatformTransitions.h>

#import <reanimated/apple/CSS/REACSSPlatformProps.h>
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

@implementation REACSSPlatformTransitions {
  __weak RCTSurfacePresenter *_surfacePresenter;
}

- (instancetype)initWithSurfacePresenter:(RCTSurfacePresenter *)surfacePresenter
{
  if (self = [super init]) {
    _surfacePresenter = surfacePresenter;
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
  double durationSec = durationMs / 1000.0;
  CFTimeInterval beginTime = startTimestampMs / 1000.0;
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

    CABasicAnimation *anim = [CABasicAnimation animationWithKeyPath:keyPath];
    // On interruption, continue from the live presentation value, falling back to the
    // model - never to fromId, which would snap a quick tap to the settled pseudo target.
    if ([[layer animationForKey:keyPath] isKindOfClass:[CABasicAnimation class]]) {
      id presentationValue = [[layer presentationLayer] valueForKeyPath:keyPath];
      anim.fromValue = presentationValue ?: [layer valueForKeyPath:keyPath];
    } else {
      anim.fromValue = fromId;
    }
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
    if (!layer) {
      return;
    }
    // Freeze the last visible frame into the model so the layer doesn't snap.
    id presentationValue = [[layer presentationLayer] valueForKeyPath:keyPath];
    if (presentationValue) {
      [layer setValue:presentationValue forKeyPath:keyPath];
    }
    [layer removeAnimationForKey:keyPath];
  });
}

@end
