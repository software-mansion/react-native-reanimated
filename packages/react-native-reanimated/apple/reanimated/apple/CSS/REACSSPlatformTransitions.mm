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

#import <algorithm>
#import <optional>
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
  /// Reversing-adjusted start value: what a later reversal has to target. A reversal
  /// resumes from the live value, so this is not where the animation started.
  std::optional<PlatformValue> adjustedStart;
  /// Where the animation started, so getCurrentValueForTag: can retrace what it plays.
  std::optional<PlatformValue> startValue;
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

- (const ActiveTransition *)activeTransitionForTag:(Tag)viewTag propertyName:(const std::string &)propertyName
{
  const auto propertiesIt = _active.find(viewTag);
  if (propertiesIt == _active.end()) {
    return nullptr;
  }
  const auto activeIt = propertiesIt->second.find(propertyName);
  return activeIt != propertiesIt->second.end() ? &activeIt->second : nullptr;
}

- (BOOL)applyTransitionForTag:(Tag)viewTag
                 propertyName:(const std::string &)propertyName
                    fromValue:(const PlatformValue &)fromValue
                      toValue:(const PlatformValue &)toValue
                     settings:(const CSSTransitionPropertySettings *)settings
                   persistent:(BOOL)persistent
                    timestamp:(double)timestamp
{
  const ActiveTransition *active = [self activeTransitionForTag:viewTag propertyName:propertyName];

  // The toggle path has no settings of its own, so it reuses the stored ones.
  const BOOL reusesStoredSettings = settings == nullptr;
  if (reusesStoredSettings && active == nullptr) {
    return NO;
  }
  // Copy: the active entry is re-assigned below.
  const CSSTransitionPropertySettings resolvedSettings = reusesStoredSettings ? active->settings : *settings;

  // Targeting the in-flight transition's start value means this is a reversal.
  const bool isReversal = active != nullptr && active->adjustedStart && toValue == *active->adjustedStart;
  ReversingState reversing = isReversal
      ? reverseShorten(
            active->reversing,
            timestamp,
            resolvedSettings.duration,
            resolvedSettings.delay,
            resolvedSettings.easingConfig)
      : makeReversingState(timestamp, resolvedSettings.duration, resolvedSettings.delay, resolvedSettings.easingConfig);

  // https://drafts.csswg.org/css-transitions/#reversing
  std::optional<PlatformValue> adjustedStart;
  std::optional<PlatformValue> startValue;
  if (active == nullptr) {
    adjustedStart = startValue = fromValue;
  } else {
    // An interruption starts from the presentation value, which the outgoing timeline
    // still describes; _active is only re-assigned below. A finished animation
    // retraces to its own end, so this covers that case too.
    startValue = [self getCurrentValueForTag:viewTag propertyName:propertyName timestamp:timestamp];
    // https://drafts.csswg.org/css-transitions/#reversing: a reversal has to target
    // where the interrupted one began, anything else starts its own reversing run.
    adjustedStart = isReversal ? active->adjustedEnd : startValue;
  }

  [self animateTag:viewTag
      propertyName:propertyName
         fromValue:fromValue
           toValue:toValue
        durationMs:reversing.duration
       startTimeMs:reversing.startTimestamp
            easing:resolvedSettings.easingConfig
        persistent:persistent];
  _active[viewTag][propertyName] =
      ActiveTransition{adjustedStart, startValue, toValue, std::move(reversing), resolvedSettings};
  return YES;
}

- (void)animateTag:(Tag)viewTag
      propertyName:(const std::string &)propertyName
         fromValue:(const PlatformValue &)fromValue
           toValue:(const PlatformValue &)toValue
        durationMs:(double)durationMs
       startTimeMs:(double)startTimeMs
            easing:(const EasingConfig &)easing
        persistent:(BOOL)persistent
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
}

- (std::optional<PlatformValue>)getCurrentValueForTag:(Tag)viewTag
                                         propertyName:(const std::string &)propertyName
                                            timestamp:(double)timestamp
{
  const ActiveTransition *active = [self activeTransitionForTag:viewTag propertyName:propertyName];
  if (active == nullptr || !active->startValue) {
    return std::nullopt;
  }
  const auto &reversing = active->reversing;
  const double progress =
      reversing.duration > 0 ? std::clamp((timestamp - reversing.startTimestamp) / reversing.duration, 0.0, 1.0) : 1.0;
  return lerpPlatformValues(
      *active->startValue, active->adjustedEnd, getEasingFunctionFromConfig(reversing.easing)(progress));
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
