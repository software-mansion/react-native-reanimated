#import <reanimated/apple/CSS/REACSSSharedNativeTransitions.h>

#import <reanimated/CSS/utils/reversingShortening.h>
#import <reanimated/apple/CSS/REACSSNativeTransitionAdapter.h>
#import <reanimated/apple/CSS/REACSSPlatformProps.h>
#import <reanimated/apple/REAUIView.h>

#import <React/RCTComponent.h>
#import <React/RCTComponentViewProtocol.h>
#import <React/RCTComponentViewRegistry.h>
#import <React/RCTMountingManager.h>
#import <React/RCTUtils.h>

#import <QuartzCore/QuartzCore.h>

#import <react/utils/hash_combine.h>

#import <optional>
#import <string>
#import <unordered_map>
#import <utility>

using namespace facebook;
using namespace facebook::react;
using namespace reanimated::css;
using namespace reanimated::native_animation;

namespace {

struct ViewKey {
  SurfaceId surfaceId;
  Tag tag;

  bool operator==(const ViewKey &) const = default;
};

struct ViewKeyHash {
  size_t operator()(const ViewKey &key) const noexcept
  {
    return facebook::react::hash_combine(key.surfaceId, key.tag);
  }
};

// Per-property state for an active transition. The adjusted endpoints and
// reversing state preserve CSS reversal rules. Settings support later toggles.
struct ActiveTransition {
  // A live interruption has no stable target that can become the next start.
  std::optional<PlatformValue> adjustedStart;
  PlatformValue adjustedEnd;
  ReversingState reversing;
  CSSTransitionPropertySettings settings;
  std::optional<AnimationHandle> nativeHandle;
  bool persistent;
};

struct ResolvedCSSTransition {
  CSSTransitionPropertySettings settings;
  ReversingState reversing;
  std::optional<PlatformValue> adjustedStart;
};

ResolvedCSSTransition resolveCSSTransition(
    const ActiveTransition *active,
    const PlatformValue &fromValue,
    const PlatformValue &toValue,
    const CSSTransitionPropertySettings &settings,
    const double timestamp)
{
  const bool isReversal = active != nullptr && active->adjustedStart && toValue == *active->adjustedStart;
  ReversingState reversing = isReversal
      ? reverseShorten(active->reversing, timestamp, settings.duration, settings.delay, settings.easingConfig)
      : makeReversingState(timestamp, settings.duration, settings.delay, settings.easingConfig);

  // https://drafts.csswg.org/css-transitions/#reversing
  std::optional<PlatformValue> adjustedStart;
  if (isReversal) {
    adjustedStart = active->adjustedEnd;
  } else if (active == nullptr) {
    adjustedStart = fromValue;
  } else if (timestamp >= active->reversing.startTimestamp + active->reversing.duration) {
    adjustedStart = active->adjustedEnd;
  }
  return {settings, std::move(reversing), adjustedStart};
}

} // namespace

@interface REACSSSharedNativeTransitions ()
- (void)freezeAndRemovePersistentTransitionForKey:(ViewKey)viewKey propertyName:(const std::string &)propertyName;
- (void)eraseActiveTransitionForKey:(ViewKey)viewKey
                       propertyName:(const std::string &)propertyName
                             handle:(reanimated::native_animation::AnimationHandle)handle;
- (void)clearNativeHandleForKey:(ViewKey)viewKey
                   propertyName:(const std::string &)propertyName
                         handle:(reanimated::native_animation::AnimationHandle)handle;
@end

@implementation REACSSSharedNativeTransitions {
  __weak RCTSurfacePresenter *_surfacePresenter;
  // TODO: This is a compatibility adapter. Remove it when CSS submits common tracks directly.
  std::shared_ptr<CSSNativeTransitionAdapter> _nativeTransitionAdapter;
  std::unordered_map<ViewKey, std::unordered_map<std::string, ActiveTransition>, ViewKeyHash> _active;
}

- (instancetype)initWithSurfacePresenter:(RCTSurfacePresenter *)surfacePresenter
                  nativeAnimationService:(std::shared_ptr<NativeAnimationService>)service
{
  if (self = [super init]) {
    _surfacePresenter = surfacePresenter;
    _nativeTransitionAdapter = std::make_shared<CSSNativeTransitionAdapter>(std::move(service));
  }
  return self;
}

- (nullable CALayer *)layerForTag:(Tag)viewTag surfaceId:(SurfaceId)surfaceId
{
  REAUIView<RCTComponentViewProtocol> *view =
      [_surfacePresenter.mountingManager.componentViewRegistry findComponentViewWithTag:viewTag];
  REAUIView *ancestor = view;
  while (ancestor != nil && !RCTIsReactRootView(@(ancestor.tag))) {
    ancestor = ancestor.superview;
  }
  if (ancestor == nil || ancestor.tag != surfaceId) {
    return nil;
  }
  return view.layer;
}

- (const ActiveTransition *)activeTransitionForKey:(ViewKey)viewKey propertyName:(const std::string &)propertyName
{
  const auto propertiesIt = _active.find(viewKey);
  if (propertiesIt == _active.end()) {
    return nullptr;
  }
  const auto activeIt = propertiesIt->second.find(propertyName);
  return activeIt != propertiesIt->second.end() ? &activeIt->second : nullptr;
}

- (BOOL)applyTransitionForTag:(Tag)viewTag
                    surfaceId:(SurfaceId)surfaceId
                 propertyName:(const std::string &)propertyName
                    fromValue:(const PlatformValue &)fromValue
                      toValue:(const PlatformValue &)toValue
                     settings:(const CSSTransitionPropertySettings *)settings
                   persistent:(BOOL)persistent
                    timestamp:(double)timestamp
{
  const ViewKey viewKey{surfaceId, viewTag};
  const ActiveTransition *active = [self activeTransitionForKey:viewKey propertyName:propertyName];
  const BOOL activeIsPersistent = active != nullptr && active->persistent;
  const BOOL reusesStoredSettings = settings == nullptr;
  if (reusesStoredSettings && active == nullptr) {
    return NO;
  }
  const auto &resolvedSettings = reusesStoredSettings ? active->settings : *settings;
  auto resolved = resolveCSSTransition(active, fromValue, toValue, resolvedSettings, timestamp);

  if (persistent) {
    // Persistent pseudo transitions are CSS state and stay outside the temporary adapter.
    [self applyPersistentTransitionForKey:viewKey
                             propertyName:propertyName
                                fromValue:fromValue
                                  toValue:toValue
                               durationMs:resolved.reversing.duration
                              startTimeMs:resolved.reversing.startTimestamp
                                   easing:resolved.settings.easingConfig];
    if (active != nullptr && active->nativeHandle) {
      _nativeTransitionAdapter->cancel(*active->nativeHandle);
    }
    _active[viewKey][propertyName] = ActiveTransition{
        resolved.adjustedStart,
        toValue,
        std::move(resolved.reversing),
        std::move(resolved.settings),
        std::nullopt,
        true,
    };
    return YES;
  }

  auto nativeTransition = _nativeTransitionAdapter->build(
      surfaceId,
      viewTag,
      propertyName,
      fromValue,
      toValue,
      resolved.settings.easingConfig,
      resolved.reversing.delay,
      resolved.reversing.duration,
      active != nullptr);
  if (!nativeTransition) {
    return NO;
  }
  const AnimationHandle handle = nativeTransition->handle;
  if (activeIsPersistent) {
    // This main-queue operation is submitted before the service request, so it
    // freezes the persistent value before the finite animation can start.
    [self freezeAndRemovePersistentTransitionForKey:viewKey propertyName:propertyName];
  }
  // Store the entry before the service call. On the main thread the service
  // can reject inline, and the rejection callback must find this entry.
  _active[viewKey][propertyName] = ActiveTransition{
      resolved.adjustedStart,
      toValue,
      std::move(resolved.reversing),
      std::move(resolved.settings),
      handle,
      false,
  };
  // The current CSS route API is synchronous, while mounted admission is not.
  // This temporary adapter routes from successful track construction and lets
  // the shared service process mounted admission asynchronously. A mounted
  // rejection does not re-route this update; the callbacks only clean the
  // stored state so a later toggle can migrate the property to the loop.
  __weak __typeof__(self) weakSelf = self;
  _nativeTransitionAdapter->schedule(
      std::move(*nativeTransition),
      [weakSelf, viewKey, propertyNameCopy = std::string(propertyName), handle](const AnimationAdmissionResult result) {
        if (result.status != AnimationAdmissionStatus::Rejected) {
          return;
        }
        [weakSelf eraseActiveTransitionForKey:viewKey propertyName:propertyNameCopy handle:handle];
      },
      [weakSelf, viewKey, propertyNameCopy = std::string(propertyName), handle](const AnimationResult) {
        [weakSelf clearNativeHandleForKey:viewKey propertyName:propertyNameCopy handle:handle];
      });
  return YES;
}

// The shared service rejected the command, so the property does not animate
// natively. Drop the entry so a later toggle finds no reusable native state.
- (void)eraseActiveTransitionForKey:(ViewKey)viewKey
                       propertyName:(const std::string &)propertyName
                             handle:(AnimationHandle)handle
{
  const auto propertiesIt = _active.find(viewKey);
  if (propertiesIt == _active.end()) {
    return;
  }
  const auto activeIt = propertiesIt->second.find(propertyName);
  if (activeIt == propertiesIt->second.end() || activeIt->second.nativeHandle != handle) {
    return;
  }
  propertiesIt->second.erase(activeIt);
  if (propertiesIt->second.empty()) {
    _active.erase(propertiesIt);
  }
}

// The command ended, so a later removal must not hand off the dead handle.
// The entry itself stays; its endpoints still drive CSS reversal bookkeeping.
- (void)clearNativeHandleForKey:(ViewKey)viewKey
                   propertyName:(const std::string &)propertyName
                         handle:(AnimationHandle)handle
{
  const auto propertiesIt = _active.find(viewKey);
  if (propertiesIt == _active.end()) {
    return;
  }
  const auto activeIt = propertiesIt->second.find(propertyName);
  if (activeIt == propertiesIt->second.end() || activeIt->second.nativeHandle != handle) {
    return;
  }
  activeIt->second.nativeHandle = std::nullopt;
}

- (void)freezeAndRemovePersistentTransitionForKey:(ViewKey)viewKey propertyName:(const std::string &)propertyName
{
  NSString *keyPath = caLayerKeyPathForCSSProperty(propertyName);
  __weak __typeof__(self) weakSelf = self;
  RCTExecuteOnMainQueue(^{
    __typeof__(self) strongSelf = weakSelf;
    if (strongSelf == nil) {
      return;
    }
    CALayer *layer = [strongSelf layerForTag:viewKey.tag surfaceId:viewKey.surfaceId];
    if (layer == nil) {
      return;
    }
    [CATransaction begin];
    [CATransaction setDisableActions:YES];
    // Freeze the last visible value into the model before removal.
    id presentationValue = [[layer presentationLayer] valueForKeyPath:keyPath];
    if (presentationValue != nil) {
      [layer setValue:presentationValue forKeyPath:keyPath];
    }
    [layer removeAnimationForKey:keyPath];
    [CATransaction commit];
  });
}

- (void)applyPersistentTransitionForKey:(ViewKey)viewKey
                           propertyName:(const std::string &)propertyName
                              fromValue:(const PlatformValue &)fromValue
                                toValue:(const PlatformValue &)toValue
                             durationMs:(double)durationMs
                            startTimeMs:(double)startTimeMs
                                 easing:(const EasingConfig &)easing
{
  // Capture owned values before the operation crosses to the main queue.
  NSString *keyPath = caLayerKeyPathForCSSProperty(propertyName);
  id fromId = idFromPlatformValue(fromValue);
  id toId = idFromPlatformValue(toValue);
  CAMediaTimingFunction *timing = makeCSSTimingFunction(easing);
  __weak __typeof__(self) weakSelf = self;
  RCTExecuteOnMainQueue(^{
    __typeof__(self) strongSelf = weakSelf;
    CALayer *layer = [strongSelf layerForTag:viewKey.tag surfaceId:viewKey.surfaceId];
    if (layer == nil) {
      return;
    }
    CABasicAnimation *animation = [CABasicAnimation animationWithKeyPath:keyPath];
    // Continue from the live value so a quick toggle does not snap.
    id presentationValue = [[layer presentationLayer] valueForKeyPath:keyPath];
    animation.fromValue = presentationValue ?: fromId;
    animation.toValue = toId;
    animation.duration = durationMs / 1000.0;
    // Convert to the layer clock so ancestor timing does not shift the start.
    animation.beginTime = [layer convertTime:startTimeMs / 1000.0 fromLayer:nil];
    animation.timingFunction = timing;
    // A persistent pseudo transition keeps its value without changing the model.
    animation.fillMode = kCAFillModeBoth;
    animation.removedOnCompletion = NO;
    [layer addAnimation:animation forKey:keyPath];
  });
}

- (void)removeTransitionForTag:(Tag)viewTag
                     surfaceId:(SurfaceId)surfaceId
                  propertyName:(const std::string &)propertyName
{
  const ViewKey viewKey{surfaceId, viewTag};
  const ActiveTransition *active = [self activeTransitionForKey:viewKey propertyName:propertyName];
  const std::optional<AnimationHandle> handle = active == nullptr ? std::nullopt : active->nativeHandle;
  const bool persistent = active != nullptr && active->persistent;
  if (const auto propertiesIt = _active.find(viewKey); propertiesIt != _active.end()) {
    propertiesIt->second.erase(propertyName);
    if (propertiesIt->second.empty()) {
      _active.erase(propertiesIt);
    }
  }

  if (handle) {
    _nativeTransitionAdapter->handoffAndRelease(*handle, propertyName);
    return;
  }
  if (!persistent) {
    return;
  }

  [self freezeAndRemovePersistentTransitionForKey:viewKey propertyName:propertyName];
}

@end
