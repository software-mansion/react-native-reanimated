#import <reanimated/Tools/ReanimatedSystraceSection.h>
#import <reanimated/apple/NativeAnimations/REANativeAnimationPlatform.h>
#import <reanimated/apple/REASlowAnimations.h>
#import <reanimated/apple/REAUIView.h>

#import <React/RCTAssert.h>
#import <React/RCTComponentViewProtocol.h>
#import <React/RCTComponentViewRegistry.h>
#import <React/RCTFabricSurface.h>
#import <React/RCTMountingManager.h>
#import <React/RCTUtils.h>
#import <react/renderer/components/view/ViewProps.h>
#import <react/renderer/components/view/ViewShadowNode.h>

#import <QuartzCore/QuartzCore.h>

#import <algorithm>
#import <cmath>
#import <cstring>
#import <string>
#import <unordered_map>
#import <utility>
#import <vector>

@interface REANativeAnimationDelegate : NSObject <CAAnimationDelegate>
- (instancetype)initWithStopHandler:(void (^)(BOOL finished))stopHandler;
@end

@implementation REANativeAnimationDelegate {
  void (^_stopHandler)(BOOL);
}

- (instancetype)initWithStopHandler:(void (^)(BOOL finished))stopHandler
{
  if (self = [super init]) {
    _stopHandler = [stopHandler copy];
  }
  return self;
}

- (void)animationDidStop:(CAAnimation *)animation finished:(BOOL)finished
{
  _stopHandler(finished);
}

@end

namespace reanimated::native_animation {

namespace {

NSString *keyPathForTarget(const AnimationTarget target)
{
  switch (target) {
    case AnimationTarget::Opacity:
      return @"opacity";
    case AnimationTarget::Position:
      return @"position";
    case AnimationTarget::PositionX:
      return @"position.x";
    case AnimationTarget::PositionY:
      return @"position.y";
    case AnimationTarget::Size:
      return @"bounds.size";
    case AnimationTarget::Width:
      return @"bounds.size.width";
    case AnimationTarget::Height:
      return @"bounds.size.height";
    case AnimationTarget::BackgroundColor:
      return @"backgroundColor";
    case AnimationTarget::BorderColor:
      return @"borderColor";
    case AnimationTarget::BorderRadius:
      return @"cornerRadius";
    case AnimationTarget::ShadowColor:
      return @"shadowColor";
    case AnimationTarget::ShadowOpacity:
      return @"shadowOpacity";
    case AnimationTarget::ShadowRadius:
      return @"shadowRadius";
    case AnimationTarget::ShadowOffset:
      return @"shadowOffset";
  }
}

NSString *const kAnimationKeyPrefix = @"reanimated.";

NSString *animationKeyForTrack(const TrackKey &track)
{
  return [NSString stringWithFormat:@"%@%u.%llu.%u",
                                    kAnimationKeyPrefix,
                                    static_cast<unsigned>(track.handle.owner),
                                    track.handle.generation,
                                    static_cast<unsigned>(track.target)];
}

CGColorSpaceRef sharedSRGBColorSpace()
{
  static CGColorSpaceRef space = nullptr;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{ space = CGColorSpaceCreateWithName(kCGColorSpaceSRGB); });
  return space;
}

struct ObjectFromValueVisitor {
  id operator()(const double scalar) const
  {
    return @(scalar);
  }
  id operator()(const AnimationPoint &point) const
  {
#if TARGET_OS_OSX
    return [NSValue valueWithPoint:NSMakePoint(point.x, point.y)];
#else
    return [NSValue valueWithCGPoint:CGPointMake(point.x, point.y)];
#endif
  }
  id operator()(const AnimationSize &size) const
  {
#if TARGET_OS_OSX
    return [NSValue valueWithSize:NSMakeSize(size.width, size.height)];
#else
    return [NSValue valueWithCGSize:CGSizeMake(size.width, size.height)];
#endif
  }
  id operator()(const AnimationColor &color) const
  {
    const CGFloat components[4] = {color.red, color.green, color.blue, color.alpha};
    return (__bridge_transfer id)CGColorCreate(sharedSRGBColorSpace(), components);
  }
};

id objectFromValue(const AnimationValue &value)
{
  return std::visit(ObjectFromValueVisitor{}, value);
}

struct ModelMatchesVisitor {
  id model;

  static bool isClose(const double lhs, const double rhs)
  {
    return std::abs(lhs - rhs) <= ENDPOINT_TOLERANCE;
  }

  bool operator()(const double scalar) const
  {
    return isClose([model doubleValue], scalar);
  }
  bool operator()(const AnimationPoint &point) const
  {
#if TARGET_OS_OSX
    const NSPoint modelPoint = [model pointValue];
#else
    const CGPoint modelPoint = [model CGPointValue];
#endif
    return isClose(modelPoint.x, point.x) && isClose(modelPoint.y, point.y);
  }
  bool operator()(const AnimationSize &size) const
  {
#if TARGET_OS_OSX
    const NSSize modelSize = [model sizeValue];
#else
    const CGSize modelSize = [model CGSizeValue];
#endif
    return isClose(modelSize.width, size.width) && isClose(modelSize.height, size.height);
  }
  bool operator()(const AnimationColor &color) const
  {
    return CGColorEqualToColor((__bridge CGColorRef)model, (__bridge CGColorRef)ObjectFromValueVisitor{}(color));
  }
};

bool modelMatchesEndpoint(CALayer *layer, const AnimationTrack &track)
{
  id model = [layer valueForKeyPath:keyPathForTarget(track.target)];
  return model != nil && std::visit(ModelMatchesVisitor{model}, track.segments.back().endValue);
}

/// React Native multiplies the layer opacity by the opacity filter, so the model does not hold the prop.
bool hasOpacityFilter(const facebook::react::ViewProps &viewProps)
{
  return std::ranges::any_of(viewProps.filter, [](const facebook::react::FilterFunction &filter) {
    return filter.type == facebook::react::FilterType::Opacity;
  });
}

bool hasOpacityFilter(REAUIView<RCTComponentViewProtocol> *view)
{
  const auto viewProps = std::dynamic_pointer_cast<const facebook::react::ViewProps>([view props]);
  return viewProps != nullptr && hasOpacityFilter(*viewProps);
}

/// False when React Native draws a part of the view from the size at the mount: a private layer, a shadow
/// path, a transform origin, or a percent translation.
bool pictureFollowsBounds(
    const facebook::react::ViewProps &viewProps,
    const facebook::react::LayoutMetrics &layoutMetrics)
{
  using namespace facebook::react;
  const auto borderMetrics = viewProps.resolveBorderMetrics(layoutMetrics);
  const auto &radii = borderMetrics.borderRadii;
  const bool hasNoBorder = borderMetrics.borderWidths.isUniform() && borderMetrics.borderWidths.left == 0 &&
      borderMetrics.borderColors.isUniform() && borderMetrics.borderStyles.isUniform() &&
      borderMetrics.borderStyles.left == BorderStyle::Solid;
  const bool hasCircularRadii = radii.isUniform() && radii.topLeft.horizontal == radii.topLeft.vertical;
  const bool hasOnlyOpacityFilters = std::ranges::all_of(
      viewProps.filter, [](const FilterFunction &filter) { return filter.type == FilterType::Opacity; });
  const bool hasSizeDependentTransform =
      viewProps.transformOrigin.isSet() ||
      std::ranges::any_of(viewProps.transform.operations, [](const TransformOperation &operation) {
        return operation.x.unit == UnitType::Percent || operation.y.unit == UnitType::Percent;
      });
  return hasNoBorder && hasCircularRadii && viewProps.outlineWidth == 0 && viewProps.boxShadow.empty() &&
      hasOnlyOpacityFilters && viewProps.backgroundImage.empty() && viewProps.shadowOpacity == 0 &&
      !hasSizeDependentTransform;
}

/// The mounted form: a private layer has no delegate.
bool pictureFollowsBounds(REAUIView *view)
{
  CALayer *layer = view.layer;
  if (layer.mask != nil) {
    return false;
  }
  for (CALayer *sublayer in layer.sublayers) {
    if (sublayer.delegate == nil) {
      return false;
    }
  }
  return true;
}

struct TimingFunctionVisitor {
  CAMediaTimingFunction *operator()(const LinearTiming &) const
  {
    return [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionLinear];
  }
  CAMediaTimingFunction *operator()(const CubicBezierTiming &bezier) const
  {
    return [CAMediaTimingFunction functionWithControlPoints:(float)bezier.x1:(float)bezier.y1:(float)bezier.x2:(float)
                                                                                                                   bezier.y2];
  }
};

id currentVisualValue(CALayer *layer, NSString *keyPath)
{
  return [[layer presentationLayer] valueForKeyPath:keyPath] ?: [layer valueForKeyPath:keyPath];
}

#ifndef NDEBUG
std::vector<double> componentsOfValue(id value)
{
  if ([value isKindOfClass:[NSNumber class]]) {
    return {[value doubleValue]};
  }
  if (![value isKindOfClass:[NSValue class]]) {
    return {};
  }
  const char *type = [value objCType];
  if (strcmp(type, @encode(CGPoint)) == 0) {
#if TARGET_OS_OSX
    const NSPoint point = [value pointValue];
#else
    const CGPoint point = [value CGPointValue];
#endif
    return {point.x, point.y};
  }
  if (strcmp(type, @encode(CGSize)) == 0) {
#if TARGET_OS_OSX
    const NSSize size = [value sizeValue];
#else
    const CGSize size = [value CGSizeValue];
#endif
    return {size.width, size.height};
  }
  return {};
}

std::vector<std::string> playbackKeys(CALayer *layer)
{
  std::vector<std::string> keys;
  for (NSString *key in layer.animationKeys) {
    if ([key hasPrefix:kAnimationKeyPrefix]) {
      keys.emplace_back(key.UTF8String);
    }
  }
  return keys;
}
#endif // NDEBUG

class CoreAnimationPlatform;

class CoreAnimationMountedAnimation final : public MountedAnimation {
 public:
  CoreAnimationMountedAnimation(CoreAnimationPlatform &platform, CALayer *layer, const AnimationRequest &request)
      : platform_(platform), layer_(layer), request_(request)
  {
  }

  std::optional<AnimationResultReason> prepare(const std::vector<AnimationTarget> &interruptedTargets) override;
  void start(const std::vector<TrackKey> &replacedTracks) override;

 private:
  struct StartValueVisitor {
    CALayer *layer;
    NSString *keyPath;
    bool isInterrupting;

    id operator()(const AnimationValue &value) const
    {
      return objectFromValue(value);
    }
    id operator()(const CurrentVisualValue &) const
    {
      return currentVisualValue(layer, keyPath);
    }
    id operator()(const VisualValueIfInterrupting &start) const
    {
      return isInterrupting ? currentVisualValue(layer, keyPath) : objectFromValue(start.otherwise);
    }
  };

  CAAnimation *makeAnimation(const AnimationTrack &track, id fromValue, id toValue) const;
  NSArray<CABasicAnimation *> *makeValueAnimations(AnimationTarget target, id fromValue, id toValue) const;
  CABasicAnimation *makeOffsetAnimation(NSString *keyPath, double fromOffset, double toOffset) const;

  CoreAnimationPlatform &platform_;
  __strong CALayer *layer_;
  const AnimationRequest &request_;
  std::vector<__strong id> startValues_;
};

class CoreAnimationPlatform final : public NativeAnimationPlatform,
                                    public std::enable_shared_from_this<CoreAnimationPlatform> {
 public:
  explicit CoreAnimationPlatform(RCTSurfacePresenter *surfacePresenter) : surfacePresenter_(surfacePresenter) {}

  void setTrackEndListener(TrackEndListener listener) override
  {
    trackEndListener_ = std::move(listener);
  }

  bool canRealize(const AnimationTrack &track, const facebook::react::ShadowView &view) override
  {
    using namespace facebook::react;
    const bool changesSize = isSizeTarget(track.target) && changesValue(track);
    if (!view.traits.check(ShadowNodeTraits::Trait::ViewKind)) {
      return !changesSize;
    }
    const auto &viewProps = static_cast<const ViewProps &>(*view.props);
    if (track.target == AnimationTarget::Opacity) {
      return !hasOpacityFilter(viewProps);
    }
    return !changesSize ||
        (std::strcmp(view.componentName, ViewComponentName) == 0 &&
         pictureFollowsBounds(viewProps, view.layoutMetrics));
  }

  bool isSurfaceRunning(const SurfaceId surfaceId) override
  {
    RCTAssertMainQueue();
    RCTFabricSurface *surface = [surfacePresenter_ surfaceForRootTag:surfaceId];
    return surface != nil && RCTSurfaceStageIsRunning(surface.stage);
  }

  MountedAnimationResolution resolve(const AnimationRequest &request) override
  {
    ReanimatedSystraceSection section("CoreAnimationPlatform::resolve");
    RCTAssertMainQueue();
    REAUIView<RCTComponentViewProtocol> *view = mountedView(request.handle.tag);
    CALayer *layer = view.layer;
    if (layer == nil) {
      return AnimationResultReason::TargetUnavailable;
    }
    for (const auto &track : request.tracks) {
      if (!canPlayWithCoreAnimation(track)) {
        return AnimationResultReason::UnsupportedRealization;
      }
      if (isSizeTarget(track.target) && changesValue(track) && !pictureFollowsBounds(view)) {
        return AnimationResultReason::UnsupportedRealization;
      }
      if (track.endpointPolicy != EndpointPolicy::MountedModelMustMatchEndpoint) {
        continue;
      }
      if (!modelMatchesEndpoint(layer, track)) {
        return AnimationResultReason::EndpointMismatch;
      }
      if (track.target == AnimationTarget::Opacity && hasOpacityFilter(view)) {
        return AnimationResultReason::UnsupportedRealization;
      }
    }
    return std::make_unique<CoreAnimationMountedAnimation>(*this, layer, request);
  }

  void stop(const TrackKey &track, const TrackStopMode mode) override
  {
    ReanimatedSystraceSection section("CoreAnimationPlatform::stop");
    RCTAssertMainQueue();
    const auto trackIt = tracks_.find(track);
    if (trackIt == tracks_.end()) {
      return;
    }
    CALayer *layer = trackIt->second;
    tracks_.erase(trackIt);

    NSString *keyPath = keyPathForTarget(track.target);
    [CATransaction begin];
    [CATransaction setDisableActions:YES];
    // A layer that left its view tag can already serve another component, so its model stays as it is.
    if (mode == TrackStopMode::KeepVisibleValue && mountedLayer(track.handle.tag) == layer) {
      [layer setValue:currentVisualValue(layer, keyPath) forKeyPath:keyPath];
    }
    [layer removeAnimationForKey:animationKeyForTrack(track)];
    [CATransaction commit];
  }

  void postToUIThread(std::function<void()> operation) override
  {
    dispatch_async(dispatch_get_main_queue(), ^{ operation(); });
  }

#ifndef NDEBUG
  std::optional<TargetSample> sample(const Tag tag, const AnimationTarget target) override
  {
    RCTAssertMainQueue();
    CALayer *layer = mountedLayer(tag);
    if (layer == nil) {
      return std::nullopt;
    }
    NSString *keyPath = keyPathForTarget(target);
    return TargetSample{
        componentsOfValue([layer valueForKeyPath:keyPath]),
        componentsOfValue(currentVisualValue(layer, keyPath)),
        playbackKeys(layer)};
  }
#endif

  void replace(const TrackKey &track)
  {
    const auto trackIt = tracks_.find(track);
    if (trackIt == tracks_.end()) {
      return;
    }
    CALayer *layer = trackIt->second;
    tracks_.erase(trackIt);
    [layer removeAnimationForKey:animationKeyForTrack(track)];
  }

  // A block captures a C++ reference as a reference, so the key comes by value.
  void play(const TrackKey track, CALayer *layer, CAAnimation *animation, const bool holdsEndValue)
  {
    const auto weakThis = weak_from_this();
    animation.delegate = [[REANativeAnimationDelegate alloc] initWithStopHandler:^(BOOL finished) {
      if (const auto strongThis = weakThis.lock()) {
        strongThis->onAnimationStopped(track, finished, holdsEndValue);
      }
    }];
    tracks_.emplace(track, layer);
    [layer addAnimation:animation forKey:animationKeyForTrack(track)];
  }

 private:
  REAUIView<RCTComponentViewProtocol> *mountedView(const Tag tag) const
  {
    return [surfacePresenter_.mountingManager.componentViewRegistry findComponentViewWithTag:tag];
  }

  CALayer *mountedLayer(const Tag tag) const
  {
    return mountedView(tag).layer;
  }

  void onAnimationStopped(const TrackKey &track, const bool finished, const bool holdsEndValue)
  {
    RCTAssertMainQueue();
    const auto trackIt = tracks_.find(track);
    if (trackIt == tracks_.end()) {
      return;
    }
    if (!(finished && holdsEndValue)) {
      tracks_.erase(trackIt);
    }
    trackEndListener_(track, finished);
  }

  __weak RCTSurfacePresenter *surfacePresenter_;
  TrackEndListener trackEndListener_;
  std::unordered_map<TrackKey, __strong CALayer *, TrackKeyHash> tracks_;
};

std::optional<AnimationResultReason> CoreAnimationMountedAnimation::prepare(
    const std::vector<AnimationTarget> &interruptedTargets)
{
  startValues_.reserve(request_.tracks.size());
  for (const auto &track : request_.tracks) {
    const bool isInterrupting =
        std::find(interruptedTargets.begin(), interruptedTargets.end(), track.target) != interruptedTargets.end();
    id startValue = std::visit(StartValueVisitor{layer_, keyPathForTarget(track.target), isInterrupting}, track.start);
    if (startValue == nil) {
      return AnimationResultReason::CurrentValueUnavailable;
    }
    startValues_.push_back(startValue);
  }
  return std::nullopt;
}

void CoreAnimationMountedAnimation::start(const std::vector<TrackKey> &replacedTracks)
{
  ReanimatedSystraceSection section("CoreAnimationMountedAnimation::start");
  [CATransaction begin];
  [CATransaction setDisableActions:YES];
  for (const auto &replacedTrack : replacedTracks) {
    platform_.replace(replacedTrack);
  }
  for (size_t index = 0; index < request_.tracks.size(); ++index) {
    const auto &track = request_.tracks[index];
    if (playbackOf(track) == TrackPlayback::Immediate) {
      continue;
    }
    id endValue = objectFromValue(track.segments.back().endValue);
    if (track.endpointPolicy == EndpointPolicy::ExecutorCommitsEndpoint) {
      [layer_ setValue:endValue forKeyPath:keyPathForTarget(track.target)];
    }
    platform_.play(
        {request_.handle, track.target},
        layer_,
        makeAnimation(track, startValues_[index], endValue),
        track.endpointPolicy == EndpointPolicy::HoldWithoutCommit);
  }
  [CATransaction commit];
}

CAAnimation *CoreAnimationMountedAnimation::makeAnimation(const AnimationTrack &track, id fromValue, id toValue) const
{
  const bool holdsEndValue = track.endpointPolicy == EndpointPolicy::HoldWithoutCommit;
  const bool holdsStartValue = playbackOf(track) == TrackPlayback::HeldThroughDelay;
  const CFTimeInterval origin = calculateMediaTimeFromSlowAnimationsTimestamp(request_.originTimestampMs / 1000.0);
  const CFTimeInterval delay = calculateMediaDurationFromSlowAnimationsDuration(track.delayMs / 1000.0);
  // The layer clock can differ from the media clock when an ancestor changes speed or time offset.
  const CFTimeInterval layerOrigin = [layer_ convertTime:origin fromLayer:nil];
  const CFTimeInterval duration =
      holdsStartValue ? delay : calculateMediaDurationFromSlowAnimationsDuration(track.durationMs / 1000.0);

  NSArray<CABasicAnimation *> *members =
      makeValueAnimations(track.target, fromValue, holdsStartValue ? fromValue : toValue);
  CAAnimation *animation = members.firstObject;
  if (members.count > 1) {
    for (CABasicAnimation *member in members) {
      member.duration = duration;
      member.fillMode = kCAFillModeBoth;
    }
    CAAnimationGroup *group = [CAAnimationGroup animation];
    group.animations = members;
    animation = group;
  }
  animation.duration = duration;
  animation.beginTime = holdsStartValue ? layerOrigin : layerOrigin + delay;
  if (!holdsStartValue) {
    animation.timingFunction = std::visit(TimingFunctionVisitor{}, track.segments.back().timingFromPrevious);
  }
  animation.fillMode = holdsEndValue ? kCAFillModeBoth : kCAFillModeBackwards;
  animation.removedOnCompletion = !holdsEndValue;
  return animation;
}

/// A position plays as an offset from the model, because a value animation hides the animations of its key
/// path that begin before it. A size moves the position by half of its offset, so the frame origin stays.
NSArray<CABasicAnimation *> *
CoreAnimationMountedAnimation::makeValueAnimations(const AnimationTarget target, id fromValue, id toValue) const
{
  NSString *keyPath = keyPathForTarget(target);
  const auto offsetOf = [this, keyPath](id value) {
    return [value doubleValue] - [[layer_ valueForKeyPath:keyPath] doubleValue];
  };
  switch (target) {
    case AnimationTarget::PositionX:
    case AnimationTarget::PositionY:
      return @[ makeOffsetAnimation(keyPath, offsetOf(fromValue), offsetOf(toValue)) ];
    case AnimationTarget::Width:
    case AnimationTarget::Height: {
      CABasicAnimation *size = [CABasicAnimation animationWithKeyPath:keyPath];
      size.fromValue = fromValue;
      size.toValue = toValue;
      NSString *positionKeyPath =
          keyPathForTarget(target == AnimationTarget::Width ? AnimationTarget::PositionX : AnimationTarget::PositionY);
      return @[ size, makeOffsetAnimation(positionKeyPath, offsetOf(fromValue) / 2, offsetOf(toValue) / 2) ];
    }
    default: {
      CABasicAnimation *animation = [CABasicAnimation animationWithKeyPath:keyPath];
      animation.fromValue = fromValue;
      animation.toValue = toValue;
      return @[ animation ];
    }
  }
}

CABasicAnimation *CoreAnimationMountedAnimation::makeOffsetAnimation(
    NSString *keyPath,
    const double fromOffset,
    const double toOffset) const
{
  CABasicAnimation *animation = [CABasicAnimation animationWithKeyPath:keyPath];
  animation.additive = YES;
  animation.fromValue = @(fromOffset);
  animation.toValue = @(toOffset);
  return animation;
}

} // namespace

bool canPlayWithCoreAnimation(const AnimationTrack &track)
{
  return track.segments.size() == 1;
}

std::shared_ptr<NativeAnimationPlatform> makeCoreAnimationPlatform(RCTSurfacePresenter *surfacePresenter)
{
  return std::make_shared<CoreAnimationPlatform>(surfacePresenter);
}

} // namespace reanimated::native_animation
