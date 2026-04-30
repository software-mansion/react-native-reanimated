#import <reanimated/apple/CSS/REACSSPlatformTransitions.h>

#import <React/RCTComponentViewProtocol.h>
#import <React/RCTComponentViewRegistry.h>
#import <React/RCTSurfacePresenter.h>
#import <React/RCTMountingManager.h>

#import <QuartzCore/QuartzCore.h>

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

static id valueForProperty(NSString *propertyName, const folly::dynamic &dynamicValue)
{
  if ([propertyName isEqualToString:@"opacity"]) {
    return @(dynamicValue.asDouble());
  }
  return nil;
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
  RCTComponentViewRegistry *registry = _surfacePresenter.mountingManager.componentViewRegistry;
  UIView<RCTComponentViewProtocol> *view = [registry findComponentViewWithTag:viewTag];
  return view.layer;
}

- (void)applyTransition:(const CSSPlatformTransitionPropertyConfig &)config
{
  CALayer *layer = [self layerForTag:config.viewTag];
  if (!layer) {
    return;
  }

  NSString *keyPath = [NSString stringWithUTF8String:config.propertyName.c_str()];
  id toValue = valueForProperty(keyPath, config.toValue);
  if (toValue == nil) {
    return;
  }

  CABasicAnimation *anim = [CABasicAnimation animationWithKeyPath:keyPath];
  anim.toValue = toValue;
  anim.duration = config.durationMs / 1000.0;
  anim.beginTime = config.startTimestampMs / 1000.0;
  anim.timingFunction = makeTimingFunction(config.easing);
  anim.fillMode = kCAFillModeBackwards;

  [layer addAnimation:anim forKey:keyPath];
}

- (void)removeTransitionForTag:(Tag)viewTag propertyName:(NSString *)propertyName
{
  CALayer *layer = [self layerForTag:viewTag];
  if (!layer) {
    return;
  }

  // Freeze the last visible frame into the model so the layer doesn't snap.
  id presentationValue = [[layer presentationLayer] valueForKeyPath:propertyName];
  if (presentationValue) {
    [layer setValue:presentationValue forKeyPath:propertyName];
  }
  [layer removeAnimationForKey:propertyName];
}

@end
