#import <reanimated/apple/CSS/REACSSPlatformTransitions.h>

#import <reanimated/CSS/utils/platform.h>
#import <reanimated/CSS/utils/reversingShortening.h>
#import <reanimated/apple/CSS/REACSSPlatformProps.h>
#import <reanimated/apple/REAUIView.h>

#import <React/RCTComponentViewProtocol.h>
#import <React/RCTComponentViewRegistry.h>
#import <React/RCTMountingManager.h>
#import <React/RCTSurfacePresenter.h>
#import <React/RCTUtils.h>

#import <QuartzCore/QuartzCore.h>

#import <string>
#import <unordered_map>
#import <utility>

using namespace facebook;
using namespace facebook::react;
using namespace reanimated::css;

namespace {

// Per-property state for an in-flight native transition. adjustedStart/adjustedEnd
// and the reversing snapshot handle interruptions; settings are reused by the
// toggle path.
struct ActiveTransition {
  PlatformValue adjustedStart;
  PlatformValue adjustedEnd;
  ReversingState reversing;
  CSSTransitionPropertySettings settings;
};

} // namespace

@implementation REACSSPlatformTransitions {
  __weak RCTSurfacePresenter *_surfacePresenter;
  // viewTag -> propertyName -> active transition. Accessed only on the thread
  // that drives routing; the CALayer work below hops to the main queue.
  std::unordered_map<Tag, std::unordered_map<std::string, ActiveTransition>> _active;
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

// Reverse-shortens against any in-flight transition, animates natively, and
// records the new active state. fromValue/toValue are already parsed.
- (void)applyForTag:(Tag)viewTag
       propertyName:(const std::string &)propertyName
          fromValue:(const PlatformValue &)fromValue
            toValue:(const PlatformValue &)toValue
           settings:(const CSSTransitionPropertySettings &)settings
          timestamp:(double)timestamp
{
  auto &properties = _active[viewTag];
  const auto activeIt = properties.find(propertyName);
  // Targeting the in-flight transition's start value means this is a reversal.
  const ActiveTransition *previous =
      (activeIt != properties.end() && toValue == activeIt->second.adjustedStart) ? &activeIt->second : nullptr;
  ReversingState reversing = previous
      ? reverseShorten(previous->reversing, timestamp, settings.duration, settings.delay, settings.easingConfig)
      : makeReversingState(timestamp, settings.duration, settings.delay, settings.easingConfig);

  const PlatformValue adjustedStart = previous ? previous->adjustedEnd : fromValue;
  [self animateTag:viewTag
      propertyName:propertyName
         fromValue:fromValue
           toValue:toValue
        durationMs:reversing.duration
       startTimeMs:reversing.startTimestamp
            easing:settings.easingConfig];
  properties[propertyName] = ActiveTransition{adjustedStart, toValue, std::move(reversing), settings};
}

- (BOOL)applyTransitionForTag:(Tag)viewTag
                 propertyName:(const std::string &)propertyName
                    fromValue:(const jsi::Value &)fromValue
                      toValue:(const jsi::Value &)toValue
                      runtime:(jsi::Runtime &)runtime
                     settings:(const CSSTransitionPropertySettings &)settings
                    timestamp:(double)timestamp
{
  const auto from = parsePlatformValue(runtime, propertyName, fromValue);
  const auto to = parsePlatformValue(runtime, propertyName, toValue);
  if (!from || !to) {
    return NO;
  }
  [self applyForTag:viewTag
       propertyName:propertyName
          fromValue:*from
            toValue:*to
           settings:settings
          timestamp:timestamp];
  return YES;
}

- (BOOL)applyDynamicTransitionForTag:(Tag)viewTag
                        propertyName:(const std::string &)propertyName
                           fromValue:(const folly::dynamic &)fromValue
                             toValue:(const folly::dynamic &)toValue
                           timestamp:(double)timestamp
{
  const auto propertiesIt = _active.find(viewTag);
  if (propertiesIt == _active.end()) {
    return NO;
  }
  const auto activeIt = propertiesIt->second.find(propertyName);
  if (activeIt == propertiesIt->second.end()) {
    // No config apply ran for this property, so there are no settings to reuse.
    return NO;
  }
  const auto from = parsePlatformValue(propertyName, fromValue);
  const auto to = parsePlatformValue(propertyName, toValue);
  if (!from || !to) {
    return NO;
  }
  // Copy: applyForTag re-assigns this property's active entry below.
  const CSSTransitionPropertySettings settings = activeIt->second.settings;
  [self applyForTag:viewTag
       propertyName:propertyName
          fromValue:*from
            toValue:*to
           settings:settings
          timestamp:timestamp];
  return YES;
}

- (void)animateTag:(Tag)viewTag
      propertyName:(const std::string &)propertyName
         fromValue:(const PlatformValue &)fromValue
           toValue:(const PlatformValue &)toValue
        durationMs:(double)durationMs
       startTimeMs:(double)startTimeMs
            easing:(const EasingConfig &)easing
{
  // Capture everything up front; CALayer access must happen on the main thread.
  NSString *keyPath = caLayerKeyPathForCSSProperty(propertyName);
  id fromId = idFromPlatformValue(fromValue);
  id toId = idFromPlatformValue(toValue);
  double durationSec = durationMs / 1000.0;
  CFTimeInterval beginTime = startTimeMs / 1000.0;
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
    // On interruption, start from the live presentation value; the implicit
    // fromValue would race RN's model commit.
    if ([[layer animationForKey:keyPath] isKindOfClass:[CABasicAnimation class]]) {
      id presentationValue = [[layer presentationLayer] valueForKeyPath:keyPath];
      anim.fromValue = presentationValue ?: fromId;
    } else {
      anim.fromValue = fromId;
    }
    anim.toValue = toId;
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
    [layer setValue:toId forKeyPath:keyPath];
    [layer addAnimation:anim forKey:keyPath];
    [CATransaction commit];
  });
}

- (void)removeTransitionForTag:(Tag)viewTag propertyName:(const std::string &)propertyName
{
  const auto propertiesIt = _active.find(viewTag);
  if (propertiesIt != _active.end()) {
    propertiesIt->second.erase(propertyName);
    if (propertiesIt->second.empty()) {
      _active.erase(propertiesIt);
    }
  }

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
