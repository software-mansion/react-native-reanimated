#import <reanimated/apple/NativeAnimations/REANativeAnimationPlatform.h>
#import <reanimated/apple/REASlowAnimations.h>
#import <reanimated/apple/REAUIView.h>

#import <React/RCTAssert.h>
#import <React/RCTComponentViewProtocol.h>
#import <React/RCTComponentViewRegistry.h>
#import <React/RCTFabricSurface.h>
#import <React/RCTMountingManager.h>
#import <React/RCTUtils.h>

#import <QuartzCore/QuartzCore.h>

#import <cmath>
#import <unordered_map>
#import <utility>

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

constexpr double kModelEndpointEpsilon = 0.01;

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

NSString *animationKeyForTrack(const TrackKey &track)
{
  return [NSString stringWithFormat:@"reanimated.%u.%llu.%u",
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
    return std::abs(lhs - rhs) <= kModelEndpointEpsilon;
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

  MountedAnimationResolution resolve(const AnimationRequest &request) override
  {
    RCTAssertMainQueue();
    const auto &handle = request.handle;
    RCTFabricSurface *surface = [surfacePresenter_ surfaceForRootTag:handle.surfaceId];
    if (surface == nil || !RCTSurfaceStageIsRunning(surface.stage)) {
      return AnimationResult{AnimationOutcome::SurfaceDestroyed};
    }
    CALayer *layer = mountedLayer(handle.tag);
    if (layer == nil) {
      return AnimationResult{AnimationOutcome::Rejected, AnimationResultReason::TargetUnavailable};
    }
    for (const auto &track : request.tracks) {
      if (!canPlayWithCoreAnimation(track)) {
        return AnimationResult{AnimationOutcome::Rejected, AnimationResultReason::UnsupportedRealization};
      }
      if (track.endpointPolicy == EndpointPolicy::MountedModelMustMatchEndpoint &&
          !modelMatchesEndpoint(layer, track)) {
        return AnimationResult{AnimationOutcome::Rejected, AnimationResultReason::EndpointMismatch};
      }
    }
    return std::make_unique<CoreAnimationMountedAnimation>(*this, layer, request);
  }

  void stop(const TrackKey &track, const TrackStopMode mode) override
  {
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
  CALayer *mountedLayer(const Tag tag) const
  {
    REAUIView<RCTComponentViewProtocol> *view =
        [surfacePresenter_.mountingManager.componentViewRegistry findComponentViewWithTag:tag];
    return view.layer;
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
  [CATransaction begin];
  [CATransaction setDisableActions:YES];
  for (const auto &replacedTrack : replacedTracks) {
    platform_.replace(replacedTrack);
  }
  for (size_t index = 0; index < request_.tracks.size(); ++index) {
    const auto &track = request_.tracks[index];
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
  const CFTimeInterval origin = calculateMediaTimeFromSlowAnimationsTimestamp(request_.originTimestampMs / 1000.0);

  CABasicAnimation *animation = [CABasicAnimation animationWithKeyPath:keyPathForTarget(track.target)];
  animation.fromValue = fromValue;
  animation.toValue = toValue;
  animation.duration = calculateMediaDurationFromSlowAnimationsDuration(track.durationMs / 1000.0);
  // The layer clock can differ from the media clock when an ancestor changes speed or time offset.
  animation.beginTime = [layer_ convertTime:origin fromLayer:nil] +
      calculateMediaDurationFromSlowAnimationsDuration(track.delayMs / 1000.0);
  animation.timingFunction = std::visit(TimingFunctionVisitor{}, track.segments.back().timingFromPrevious);
  animation.fillMode = holdsEndValue ? kCAFillModeBoth : kCAFillModeBackwards;
  animation.removedOnCompletion = !holdsEndValue;
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
