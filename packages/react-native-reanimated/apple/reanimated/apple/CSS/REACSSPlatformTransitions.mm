#import <reanimated/apple/CSS/REACSSPlatformTransitions.h>

#import <reanimated/CSS/utils/platform.h>
#import <reanimated/apple/REAUIView.h>

#import <React/RCTComponentViewProtocol.h>
#import <React/RCTComponentViewRegistry.h>
#import <React/RCTMountingManager.h>
#import <React/RCTSurfacePresenter.h>
#import <React/RCTUtils.h>

#import <QuartzCore/QuartzCore.h>

#import <stdexcept>
#import <string>
#import <variant>

using namespace facebook::react;
using namespace reanimated::css;

bool canRouteCSSProperty(const std::string &propertyName, const EasingConfig &easing)
{
  if (propertyName != "opacity") {
    return false;
  }
  return std::holds_alternative<LinearEasing>(easing) || std::holds_alternative<CubicBezierEasing>(easing);
}

static CAMediaTimingFunction *makeTimingFunction(const EasingConfig &easing)
{
  if (std::holds_alternative<CubicBezierEasing>(easing)) {
    const auto &cb = std::get<CubicBezierEasing>(easing);
    return [CAMediaTimingFunction functionWithControlPoints:(float)cb.x1:(float)cb.y1:(float)cb.x2:(float)cb.y2];
  }
  return [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionLinear];
}

static id idFromPlatformValue(NSString *propertyName, const PlatformValue &value)
{
  if (const auto *v = std::get_if<double>(&value)) {
    return @(*v);
  }
  // Fired when the parser produced a variant alternative the iOS renderer
  // doesn't yet handle, or std::monostate (parser couldn't parse the value).
  // Both indicate a developer-side bug worth surfacing loudly.
  throw std::runtime_error(
      std::string("[Reanimated] iOS renderer cannot convert PlatformValue for property '") +
      std::string(propertyName.UTF8String) + "'");
}

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
  // CALayer access must run on the main thread; runCSSTransition arrives here
  // on the JS thread during React's shouldComponentUpdate.
  Tag viewTag = config.viewTag;
  NSString *keyPath = [NSString stringWithUTF8String:config.propertyName.c_str()];
  id toValue = idFromPlatformValue(keyPath, config.toValue);
  id fromValue = idFromPlatformValue(keyPath, config.fromValue);
  double durationSec = config.durationMs / 1000.0;
  CFTimeInterval beginTime = config.startTimestampMs / 1000.0;
  CAMediaTimingFunction *timing = makeTimingFunction(config.easing);

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
    // Implicit fromValue races RN's model commit; on reversal we want the
    // live presentation value, mirroring how the loop side picks up the
    // interpolator's last output on interruption.
    if ([[layer animationForKey:keyPath] isKindOfClass:[CABasicAnimation class]]) {
      id presentationValue = [[layer presentationLayer] valueForKeyPath:keyPath];
      anim.fromValue = presentationValue ?: fromValue;
    } else {
      anim.fromValue = fromValue;
    }
    anim.toValue = toValue;
    anim.duration = durationSec;
    // beginTime is in the layer's local clock; convert from absolute time so
    // ancestor speed/timeOffset (e.g. RN Screens during navigation) doesn't
    // make the animation appear already complete or never-starting.
    anim.beginTime = [layer convertTime:beginTime fromLayer:nil];
    anim.timingFunction = timing;
    // Backwards fill paints fromValue during the delay window; the animation
    // self-removes on completion and the layer reads the model below.
    anim.fillMode = kCAFillModeBackwards;
    anim.removedOnCompletion = YES;

    // Commit toValue to the model first (with implicit actions disabled), then
    // add the animation in the same transaction. The model is correct for the
    // entire lifetime of the animation; once the animation auto-removes the
    // layer reads the model and there's no snap. This is what stops stale
    // animations from outliving their view and bleeding onto layers that RN
    // has since recycled onto unrelated components.
    [CATransaction begin];
    [CATransaction setDisableActions:YES];
    [layer setValue:toValue forKeyPath:keyPath];
    [layer addAnimation:anim forKey:keyPath];
    [CATransaction commit];
  });
}

- (void)removeTransitionForTag:(Tag)viewTag propertyName:(NSString *)propertyName
{
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
    id presentationValue = [[layer presentationLayer] valueForKeyPath:propertyName];
    if (presentationValue) {
      [layer setValue:presentationValue forKeyPath:propertyName];
    }
    [layer removeAnimationForKey:propertyName];
  });
}

@end
