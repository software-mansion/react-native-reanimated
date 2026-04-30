#import <reanimated/apple/CSS/REACSSPlatformTransitions.h>

#import <reanimated/CSS/utils/platform.h>

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
  UIView<RCTComponentViewProtocol> *view =
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
    anim.beginTime = beginTime;
    anim.timingFunction = timing;
    // Persist so presentation holds the animated value before beginTime
    // (kCAFillModeBackwards) and after duration (kCAFillModeForwards),
    // overriding any concurrent model commits. Cleared in removeTransition.
    anim.fillMode = kCAFillModeBoth;
    anim.removedOnCompletion = NO;
    [layer addAnimation:anim forKey:keyPath];
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
