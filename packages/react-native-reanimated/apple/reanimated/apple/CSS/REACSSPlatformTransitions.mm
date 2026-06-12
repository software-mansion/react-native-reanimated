#import <reanimated/apple/CSS/REACSSPlatformTransitions.h>

#import <reanimated/apple/CSS/REACSSPlatformProps.h>
#import <reanimated/apple/REAUIView.h>

#import <React/RCTComponentViewProtocol.h>
#import <React/RCTComponentViewRegistry.h>
#import <React/RCTMountingManager.h>
#import <React/RCTSurfacePresenter.h>
#import <React/RCTUtils.h>

#import <QuartzCore/QuartzCore.h>

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

- (void)applyTransition:(const CSSPlatformTransitionPropertyConfig &)config
{
  // Capture everything up front; CALayer access must happen on the main thread.
  Tag viewTag = config.viewTag;
  NSString *keyPath = keyPathForCSSProperty(config.propertyName);
  id toValue = idFromPlatformValue(config.toValue);
  id fromValue = idFromPlatformValue(config.fromValue);
  double durationSec = config.durationMs / 1000.0;
  CFTimeInterval beginTime = config.startTimestampMs / 1000.0;
  CAMediaTimingFunction *timing = makeCSSTimingFunction(config.easing);

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
    // On interruption, start from the live presentation value; the implicit
    // fromValue would race RN's model commit.
    if ([[layer animationForKey:keyPath] isKindOfClass:[CABasicAnimation class]]) {
      id presentationValue = [[layer presentationLayer] valueForKeyPath:keyPath];
      anim.fromValue = presentationValue ?: fromValue;
    } else {
      anim.fromValue = fromValue;
    }
    anim.toValue = toValue;
    anim.duration = durationSec;
    // beginTime is in the layer's local clock; converting keeps ancestor
    // speed/timeOffset (e.g. RN Screens during navigation) from shifting it.
    anim.beginTime = [layer convertTime:beginTime fromLayer:nil];
    anim.timingFunction = timing;
    // Backwards fill paints fromValue during the delay window; the animation
    // self-removes on completion and the layer reads the model below.
    anim.fillMode = kCAFillModeBackwards;
    anim.removedOnCompletion = YES;

    // Commit toValue to the model and add the animation in one transaction
    // (implicit actions off): on auto-removal the layer shows the final model
    // value with no snap, and recycled layers carry no stale animated state.
    [CATransaction begin];
    [CATransaction setDisableActions:YES];
    [layer setValue:toValue forKeyPath:keyPath];
    [layer addAnimation:anim forKey:keyPath];
    [CATransaction commit];
  });
}

- (void)removeTransitionForTag:(Tag)viewTag propertyName:(const std::string &)propertyName
{
  NSString *keyPath = keyPathForCSSProperty(propertyName);
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
