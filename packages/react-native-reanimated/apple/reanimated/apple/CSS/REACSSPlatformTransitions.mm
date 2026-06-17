#import <reanimated/apple/CSS/REACSSPlatformTransitions.h>

#import <reanimated/CSS/utils/reversingShortening.h>
#import <reanimated/CSS/utils/transformAnimation.h>
#import <reanimated/apple/CSS/REACSSPlatformProps.h>
#import <reanimated/apple/CSS/REACSSPlatformValue.h>
#import <reanimated/apple/REAUIView.h>

#import <React/RCTComponentViewProtocol.h>
#import <React/RCTComponentViewRegistry.h>
#import <React/RCTMountingManager.h>
#import <React/RCTSurfacePresenter.h>
#import <React/RCTUtils.h>

#import <folly/dynamic.h>
#import <jsi/jsi.h>

#import <QuartzCore/QuartzCore.h>

#import <memory>
#import <string>
#import <unordered_map>
#import <utility>
#import <variant>

using namespace facebook;
using namespace facebook::react;
using namespace reanimated::css;

namespace {

// Per-scalar-property native transition state. The platform owns it (shared
// code is value-agnostic for scalars): adjustedStart/adjustedEnd + the reversing
// snapshot drive reverse-shortening when a transition is interrupted, and
// settings are reused on the runtime-free toggle path (which carries no settings
// of its own). Transform keeps no platform-side state - its value model lives in
// common C++ (CSSPlatformTransitionProxy), which hands this object a finished plan.
struct ActiveTransition {
  PlatformValue adjustedStart;
  PlatformValue adjustedEnd;
  ReversingState reversing;
  CSSTransitionPropertySettings settings;
};

CATransform3D caTransform3DFromMatrixArray(const TransformMatrixArray &matrix)
{
  // TransformMatrix3D is row-major with translation at indices 12-14 -
  // bit-compatible with CATransform3D's m11..m44 field order, matching how RN
  // consumes the 16-element `matrix` transform style value.
  CATransform3D transform;
  transform.m11 = matrix[0];
  transform.m12 = matrix[1];
  transform.m13 = matrix[2];
  transform.m14 = matrix[3];
  transform.m21 = matrix[4];
  transform.m22 = matrix[5];
  transform.m23 = matrix[6];
  transform.m24 = matrix[7];
  transform.m31 = matrix[8];
  transform.m32 = matrix[9];
  transform.m33 = matrix[10];
  transform.m34 = matrix[11];
  transform.m41 = matrix[12];
  transform.m42 = matrix[13];
  transform.m43 = matrix[14];
  transform.m44 = matrix[15];
  return transform;
}

CAValueFunctionName valueFunctionName(TransformFunctionType type)
{
  switch (type) {
    case TransformFunctionType::RotateX:
      return kCAValueFunctionRotateX;
    case TransformFunctionType::RotateY:
      return kCAValueFunctionRotateY;
    case TransformFunctionType::RotateZ:
      return kCAValueFunctionRotateZ;
    case TransformFunctionType::Scale:
      return kCAValueFunctionScale;
    case TransformFunctionType::ScaleX:
      return kCAValueFunctionScaleX;
    case TransformFunctionType::ScaleY:
      return kCAValueFunctionScaleY;
    case TransformFunctionType::TranslateX:
      return kCAValueFunctionTranslateX;
    case TransformFunctionType::TranslateY:
      return kCAValueFunctionTranslateY;
  }
}

// kCAValueFunctionScale takes three inputs; everything else is a scalar.
id segmentAnimationValue(TransformFunctionType type, double value)
{
  if (type == TransformFunctionType::Scale) {
    return @[ @(value), @(value), @(value) ];
  }
  return @(value);
}

// Shared timing setup for both the scalar and transform paths: local-clock
// beginTime conversion (so an ancestor's speed/timeOffset, e.g. RN Screens during
// navigation, doesn't shift it) plus backwards fill (paints the from state during
// the delay window) and self-removal on completion (the layer then reads the
// committed model value with no snap). Callers add the value function / from-to
// pair / timing function themselves.
void configureAnimationTiming(CABasicAnimation *anim, CALayer *layer, double durationSec, CFTimeInterval beginTime)
{
  anim.duration = durationSec;
  anim.beginTime = [layer convertTime:beginTime fromLayer:nil];
  anim.fillMode = kCAFillModeBackwards;
  anim.removedOnCompletion = YES;
}

// Animation keys used for transform: "transform" for the base/matrix
// animation plus "transform#i" per function segment. Segment counts change
// between runs, so retargets and cancels remove every prefixed key instead of
// relying on same-key replacement.
void removeTransformAnimations(CALayer *layer, NSString *keyPath)
{
  NSString *segmentPrefix = [keyPath stringByAppendingString:@"#"];
  for (NSString *key in [layer.animationKeys copy]) {
    if ([key isEqualToString:keyPath] || [key hasPrefix:segmentPrefix]) {
      [layer removeAnimationForKey:key];
    }
  }
}

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

  ActiveTransition entry;
  entry.adjustedStart = adjustedStart;
  entry.adjustedEnd = toValue;
  entry.reversing = std::move(reversing);
  entry.settings = settings;
  properties[propertyName] = std::move(entry);
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
  // Copy: the apply path re-assigns this property's active entry below.
  const CSSTransitionPropertySettings settings = activeIt->second.settings;

  const auto from = parsePlatformValue(propertyName, fromValue);
  const auto to = parsePlatformValue(propertyName, toValue);
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

- (void)animateTag:(Tag)viewTag
      propertyName:(const std::string &)propertyName
         fromValue:(const PlatformValue &)fromValue
           toValue:(const PlatformValue &)toValue
        durationMs:(double)durationMs
       startTimeMs:(double)startTimeMs
            easing:(const EasingConfig &)easing
{
  // Capture everything up front; CALayer access must happen on the main thread.
  NSString *keyPath = [NSString stringWithUTF8String:propertyName.c_str()];
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
    anim.timingFunction = timing;
    configureAnimationTiming(anim, layer, durationSec, beginTime);

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

- (void)animateTransformForTag:(Tag)viewTag
                          plan:(const TransformAnimationPlan &)planValue
                    durationMs:(double)durationMs
                   startTimeMs:(double)startTimeMs
                        easing:(const EasingConfig &)easing
{
  NSString *keyPath = @"transform";
  const auto plan = planValue;
  double durationSec = durationMs / 1000.0;
  CFTimeInterval beginTime = startTimeMs / 1000.0;
  CAMediaTimingFunction *timing = makeCSSTimingFunction(easing);
  CATransform3D targetMatrix = caTransform3DFromMatrixArray(plan.targetMatrix);

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

    // Guard against a zero duration so Core Animation still runs the (instant)
    // animation window and the additive stack composes for one frame.
    const double safeDurationSec = MAX(durationSec, 0.0001);
    const auto configureTiming = ^(CABasicAnimation *anim) {
      configureAnimationTiming(anim, layer, safeDurationSec, beginTime);
    };

    // Commit the final matrix to the model and add the animations in one
    // transaction (implicit actions off), same rationale as the scalar path.
    // Unlike that path there is no presentation-value substitution on
    // retargeting: the C++ side already rebuilt the plan from the exact
    // in-flight value (a presentation matrix would collapse rotation count).
    [CATransaction begin];
    [CATransaction setDisableActions:YES];
    removeTransformAnimations(layer, keyPath);
    [layer setValue:[NSValue valueWithCATransform3D:targetMatrix] forKeyPath:keyPath];

    if (plan.segments.empty()) {
      // Matrix fallback: Core Animation interpolates the decomposed matrices
      // (translation lerp + shortest-path rotation) - the same cases where
      // the loop also interpolates decomposed matrices.
      CABasicAnimation *anim = [CABasicAnimation animationWithKeyPath:keyPath];
      anim.fromValue = [NSValue valueWithCATransform3D:caTransform3DFromMatrixArray(plan.fromMatrix)];
      anim.toValue = [NSValue valueWithCATransform3D:targetMatrix];
      anim.timingFunction = timing;
      configureTiming(anim);
      [layer addAnimation:anim forKey:keyPath];
    } else {
      // Per-operation stack: a non-additive identity base replaces the model
      // for the animation window, then one additive animation per operation
      // rebuilds the full transform - scalar segments via their CAValueFunction,
      // skew/perspective via matrix endpoint pairs.
      //
      // Segments are added in REVERSE declaration order: Core Animation
      // composites the additive transform stack opposite to add-order (and
      // opposite to what presentation.transform reports via KVC), so adding
      // op[N-1] first down to op[0] last makes the GPU render
      // op[N-1] * ... * op[0] = matrixFromOperations3D, matching the loop and
      // preserving operation order, duplicates and rotation count.
      CABasicAnimation *base = [CABasicAnimation animationWithKeyPath:keyPath];
      base.fromValue = base.toValue = [NSValue valueWithCATransform3D:CATransform3DIdentity];
      configureTiming(base);
      [layer addAnimation:base forKey:keyPath];

      __block NSUInteger segmentKey = 0;
      CAMediaTimingFunction *segmentTiming = timing;
      void (^addAdditive)(id, id, CAValueFunction *) = ^(id fromValue, id toValue, CAValueFunction *valueFunction) {
        CABasicAnimation *anim = [CABasicAnimation animationWithKeyPath:keyPath];
        anim.valueFunction = valueFunction;
        anim.fromValue = fromValue;
        anim.toValue = toValue;
        anim.additive = YES;
        anim.timingFunction = segmentTiming;
        configureTiming(anim);
        [layer addAnimation:anim forKey:[NSString stringWithFormat:@"%@#%lu", keyPath, (unsigned long)segmentKey++]];
      };

      for (size_t r = 0; r < plan.segments.size(); ++r) {
        const size_t i = plan.segments.size() - 1 - r;
        if (const auto *scalarSegment = std::get_if<TransformScalarSegment>(&plan.segments[i])) {
          addAdditive(
              segmentAnimationValue(scalarSegment->type, scalarSegment->fromValue),
              segmentAnimationValue(scalarSegment->type, scalarSegment->toValue),
              [CAValueFunction functionWithName:valueFunctionName(scalarSegment->type)]);
        } else {
          const auto &matrixSegment = std::get<TransformMatrixSegment>(plan.segments[i]);
          addAdditive(
              [NSValue valueWithCATransform3D:caTransform3DFromMatrixArray(matrixSegment.fromMatrix)],
              [NSValue valueWithCATransform3D:caTransform3DFromMatrixArray(matrixSegment.toMatrix)],
              nil);
        }
      }
    }

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

  NSString *keyPath = [NSString stringWithUTF8String:propertyName.c_str()];
  const bool isTransform = propertyName == "transform";
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
    // Scalars (opacity): freeze the reliable presentation value into the model
    // to avoid a snap on cancel. Transform skips this - presentation.transform
    // reports the additive value-function stack in reversed composition order
    // via KVC (it would freeze a reversed pose), so leave the already-committed
    // target matrix and let the layer settle there (CSS after-change value).
    if (!isTransform) {
      id presentationValue = [[layer presentationLayer] valueForKeyPath:keyPath];
      if (presentationValue) {
        [layer setValue:presentationValue forKeyPath:keyPath];
      }
    }
    removeTransformAnimations(layer, keyPath);
  });
}

@end
