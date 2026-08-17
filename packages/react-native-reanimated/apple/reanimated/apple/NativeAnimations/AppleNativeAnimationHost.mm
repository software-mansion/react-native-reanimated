#import <reanimated/apple/NativeAnimations/AppleNativeAnimationHost.h>

#import <reanimated/NativeAnimations/NativeAnimationHost.h>
#import <reanimated/NativeAnimations/NativeAnimationInterfaces.h>
#import <reanimated/apple/REAUIView.h>

#import <React/RCTAssert.h>
#import <React/RCTComponent.h>
#import <React/RCTComponentViewProtocol.h>
#import <React/RCTComponentViewRegistry.h>
#import <React/RCTMountingManager.h>
#import <React/RCTUtils.h>

#import <react/utils/hash_combine.h>

#import <QuartzCore/QuartzCore.h>

#import <array>
#import <cmath>
#import <limits>
#import <optional>
#import <unordered_map>
#import <utility>
#import <variant>

@interface REANativeAnimationDelegate : NSObject <CAAnimationDelegate>
@property (nonatomic, copy) void (^completion)(BOOL);
@end

@implementation REANativeAnimationDelegate
- (void)animationDidStop:(CAAnimation *)animation finished:(BOOL)finished
{
  if (_completion != nil) {
    _completion(finished);
  }
}
@end

namespace reanimated::native_animation {

namespace {

struct ActiveTrackKey {
  AnimationHandle handle;
  AnimationTarget target;

  bool operator==(const ActiveTrackKey &) const = default;
};

struct ActiveTrackKeyHash {
  size_t operator()(const ActiveTrackKey &key) const noexcept
  {
    return facebook::react::hash_combine(AnimationHandleHash{}(key.handle), static_cast<uint8_t>(key.target.kind));
  }
};

NSString *coreAnimationKey(const AnimationHandle &handle, const AnimationTarget target)
{
  return [NSString stringWithFormat:@"reanimated.native.%d.%d.%u.%llu.%u",
                                    handle.surfaceId,
                                    handle.tag,
                                    static_cast<unsigned>(handle.owner),
                                    handle.generation,
                                    static_cast<unsigned>(target.kind)];
}

SurfaceId surfaceIdForView(REAUIView *view)
{
  while (view != nil) {
    if (RCTIsReactRootView(@(view.tag))) {
      return static_cast<SurfaceId>(view.tag);
    }
    view = view.superview;
  }
  return -1;
}

NSString *keyPathForTarget(const AnimationTarget target)
{
  switch (target.kind) {
    case AnimationTargetKind::Opacity:
      return @"opacity";
    case AnimationTargetKind::Position:
      return @"position";
    case AnimationTargetKind::PositionX:
      return @"position.x";
    case AnimationTargetKind::PositionY:
      return @"position.y";
    case AnimationTargetKind::Size:
      return @"bounds.size";
    case AnimationTargetKind::Width:
      return @"bounds.size.width";
    case AnimationTargetKind::Height:
      return @"bounds.size.height";
    case AnimationTargetKind::BackgroundColor:
      return @"backgroundColor";
    case AnimationTargetKind::BorderColor:
      return @"borderColor";
    case AnimationTargetKind::BorderRadius:
      return @"cornerRadius";
    case AnimationTargetKind::BorderWidth:
      return @"borderWidth";
    case AnimationTargetKind::ShadowColor:
      return @"shadowColor";
    case AnimationTargetKind::ShadowOpacity:
      return @"shadowOpacity";
    case AnimationTargetKind::ShadowRadius:
      return @"shadowRadius";
    case AnimationTargetKind::ShadowOffset:
      return @"shadowOffset";
    case AnimationTargetKind::Transform:
      return @"transform";
  }
}

bool mountedViewSupportsTarget(const AnimationTarget target)
{
  switch (target.kind) {
    case AnimationTargetKind::BorderColor:
    case AnimationTargetKind::BorderRadius:
    case AnimationTargetKind::BorderWidth:
      // React Native can rasterize borders into layer contents. In that case,
      // changes to CALayer border properties are not visible.
      // TODO: Move this rule to Apple capability routing if all component types
      // remain unsupported. Otherwise, inspect the mounted component here.
      return false;
    default:
      return true;
  }
}

CGColorSpaceRef sharedSRGBColorSpace()
{
  static CGColorSpaceRef space = nullptr;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{ space = CGColorSpaceCreateWithName(kCGColorSpaceSRGB); });
  return space;
}

id objectFromValue(const AnimationValue &value)
{
  if (const auto *scalar = std::get_if<double>(&value)) {
    return @(*scalar);
  }
  if (const auto *point = std::get_if<AnimationPoint>(&value)) {
#if TARGET_OS_OSX
    return [NSValue valueWithPoint:NSMakePoint(point->x, point->y)];
#else
    return [NSValue valueWithCGPoint:CGPointMake(point->x, point->y)];
#endif
  }
  if (const auto *size = std::get_if<AnimationSize>(&value)) {
#if TARGET_OS_OSX
    return [NSValue valueWithSize:NSMakeSize(size->width, size->height)];
#else
    return [NSValue valueWithCGSize:CGSizeMake(size->width, size->height)];
#endif
  }
  if (const auto *color = std::get_if<AnimationColor>(&value)) {
    const CGFloat components[4] = {color->red, color->green, color->blue, color->alpha};
    return (__bridge_transfer id)CGColorCreate(sharedSRGBColorSpace(), components);
  }
  const auto &components = std::get<AnimationMatrix4>(value).values;
  CATransform3D transform = {
      components[0],
      components[1],
      components[2],
      components[3],
      components[4],
      components[5],
      components[6],
      components[7],
      components[8],
      components[9],
      components[10],
      components[11],
      components[12],
      components[13],
      components[14],
      components[15],
  };
  return [NSValue valueWithCATransform3D:transform];
}

std::optional<AnimationValue> valueFromObject(id object, const AnimationTarget target)
{
  if (object == nil) {
    return std::nullopt;
  }
  switch (target.kind) {
    case AnimationTargetKind::Position: {
#if TARGET_OS_OSX
      const NSPoint point = [object pointValue];
#else
      const CGPoint point = [object CGPointValue];
#endif
      return AnimationPoint{point.x, point.y};
    }
    case AnimationTargetKind::Size:
    case AnimationTargetKind::ShadowOffset: {
#if TARGET_OS_OSX
      const NSSize size = [object sizeValue];
#else
      const CGSize size = [object CGSizeValue];
#endif
      return AnimationSize{size.width, size.height};
    }
    case AnimationTargetKind::BackgroundColor:
    case AnimationTargetKind::BorderColor:
    case AnimationTargetKind::ShadowColor: {
      CGColorRef color = (__bridge CGColorRef)object;
      const size_t count = CGColorGetNumberOfComponents(color);
      const CGFloat *components = CGColorGetComponents(color);
      if (count == 2) {
        return AnimationColor{components[0], components[0], components[0], components[1]};
      }
      if (count >= 4) {
        return AnimationColor{components[0], components[1], components[2], components[3]};
      }
      return std::nullopt;
    }
    case AnimationTargetKind::Transform: {
      const CATransform3D transform = [object CATransform3DValue];
      return AnimationMatrix4{{
          transform.m11,
          transform.m12,
          transform.m13,
          transform.m14,
          transform.m21,
          transform.m22,
          transform.m23,
          transform.m24,
          transform.m31,
          transform.m32,
          transform.m33,
          transform.m34,
          transform.m41,
          transform.m42,
          transform.m43,
          transform.m44,
      }};
    }
    default:
      return [object doubleValue];
  }
}

CAMediaTimingFunction *timingFunction(const AnimationTiming &timing)
{
  if (const auto *bezier = std::get_if<CubicBezier>(&timing)) {
    return [CAMediaTimingFunction functionWithControlPoints:bezier->x1:bezier->y1:bezier->x2:bezier->y2];
  }
  if (std::holds_alternative<LinearTiming>(timing)) {
    return [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionLinear];
  }
  return nil;
}

std::optional<int64_t> checkedNanosecondsFromMilliseconds(const double milliseconds)
{
  const long double nanoseconds = static_cast<long double>(milliseconds) * static_cast<long double>(NSEC_PER_MSEC);
  if (!std::isfinite(nanoseconds) || nanoseconds > static_cast<long double>(std::numeric_limits<int64_t>::max())) {
    return std::nullopt;
  }
  return static_cast<int64_t>(nanoseconds);
}

class ApplePlatformUIScheduler final : public PlatformUIScheduler,
                                       public std::enable_shared_from_this<ApplePlatformUIScheduler> {
 public:
  void schedule(PlatformUIOperation operation) override
  {
    auto sharedOperation = std::make_shared<PlatformUIOperation>(std::move(operation));
    const std::weak_ptr<ApplePlatformUIScheduler> weakScheduler = weak_from_this();
    RCTExecuteOnMainQueue(^{
      const auto scheduler = weakScheduler.lock();
      if (!scheduler) {
        return;
      }
      scheduler->execute(sharedOperation);
    });
  }

 private:
  class ExecutionGuard {
   public:
    explicit ExecutionGuard(ApplePlatformUIScheduler &scheduler) : scheduler_(scheduler)
    {
      scheduler_.isExecuting_ = true;
    }

    ~ExecutionGuard()
    {
      scheduler_.isExecuting_ = false;
    }

   private:
    ApplePlatformUIScheduler &scheduler_;
  };

  void execute(const std::shared_ptr<PlatformUIOperation> &operation)
  {
    RCTAssertMainQueue();
    if (isExecuting_) {
      const std::weak_ptr<ApplePlatformUIScheduler> weakScheduler = weak_from_this();
      // The block captures C++ references as references, so it must copy the
      // shared_ptr to keep the operation alive after execute() returns.
      // NOLINTNEXTLINE(performance-unnecessary-copy-initialization)
      const auto deferredOperation = operation;
      dispatch_async(dispatch_get_main_queue(), ^{
        if (const auto scheduler = weakScheduler.lock()) {
          scheduler->execute(deferredOperation);
        }
      });
      return;
    }
    const ExecutionGuard guard{*this};
    (*operation)();
  }

  bool isExecuting_{false};
};

class AppleResolvedAnimationTarget final : public ResolvedAnimationTarget {
 public:
  AppleResolvedAnimationTarget(CALayer *layer, NSString *keyPath) : layer_(layer), keyPath_(keyPath) {}

  CALayer *layer() const
  {
    return layer_;
  }

  NSString *keyPath() const
  {
    return keyPath_;
  }

 private:
  __strong CALayer *layer_;
  __strong NSString *keyPath_;
};

class AppleNativeAnimationTargetResolver final : public NativeAnimationTargetResolver {
 public:
  explicit AppleNativeAnimationTargetResolver(RCTSurfacePresenter *surfacePresenter)
      : surfacePresenter_(surfacePresenter)
  {
  }

  TargetBatchResolution resolveTargets(const AnimationHandle &handle, const std::vector<AnimationTarget> &targets)
      override
  {
    RCTAssertMainQueue();
    RCTSurfacePresenter *surfacePresenter = surfacePresenter_;
    if (surfacePresenter == nil) {
      return AnimationResultReason::TargetUnavailable;
    }
    REAUIView<RCTComponentViewProtocol> *view =
        [surfacePresenter.mountingManager.componentViewRegistry findComponentViewWithTag:handle.tag];
    if (view == nil || surfaceIdForView(view) != handle.surfaceId || view.layer == nil) {
      return AnimationResultReason::TargetUnavailable;
    }
    ResolvedAnimationTargets resolvedTargets;
    resolvedTargets.reserve(targets.size());
    for (const auto target : targets) {
      if (!mountedViewSupportsTarget(target)) {
        return AnimationResultReason::UnsupportedTargetRealization;
      }
      resolvedTargets.push_back(std::make_unique<AppleResolvedAnimationTarget>(view.layer, keyPathForTarget(target)));
    }
    return resolvedTargets;
  }

 private:
  __weak RCTSurfacePresenter *surfacePresenter_;
};

struct PreparedTrack {
  AnimationTarget target;
  __strong CALayer *layer;
  __strong NSString *keyPath;
  __strong id fromValue;
  __strong id toValue;
  __strong CAMediaTimingFunction *timingFunction;
  double delayMs;
  double durationMs;
  std::optional<int64_t> zeroDurationDelayNanoseconds;
};

class ApplePreparedNativeAnimation final : public PreparedNativeAnimation {
 public:
  explicit ApplePreparedNativeAnimation(std::vector<PreparedTrack> tracks) : tracks(std::move(tracks)) {}

  std::vector<PreparedTrack> tracks;
};

class AppleNativeAnimationExecutor final : public NativeAnimationExecutor,
                                           public std::enable_shared_from_this<AppleNativeAnimationExecutor> {
 public:
  NativeAnimationPreparation prepare(const AnimationHandle &, std::vector<ResolvedAnimationTrack> tracks) override
  {
    RCTAssertMainQueue();
    std::vector<PreparedTrack> preparedTracks;
    preparedTracks.reserve(tracks.size());
    for (const auto &resolvedTrack : tracks) {
      const auto &track = resolvedTrack.track;
      // TODO: add structured and sampled keyframe tracks. for now this is just the basic case
      if (track.keyframes.size() != 1 || track.keyframes.front().offset != 1) {
        return AnimationResultReason::UnsupportedTargetRealization;
      }
      CAMediaTimingFunction *timing = timingFunction(track.keyframes.front().timingToNext);
      if (timing == nil) {
        return AnimationResultReason::UnsupportedTargetRealization;
      }
      std::optional<int64_t> zeroDurationDelayNanoseconds;
      if (track.durationMs == 0) {
        zeroDurationDelayNanoseconds = checkedNanosecondsFromMilliseconds(track.delayMs);
        if (!zeroDurationDelayNanoseconds) {
          return AnimationResultReason::ResourceLimit;
        }
      }
      const auto &resolved = static_cast<const AppleResolvedAnimationTarget &>(*resolvedTrack.target);
      id fromValue;
      if (const auto *explicitStart = std::get_if<AnimationValue>(&track.start)) {
        fromValue = objectFromValue(*explicitStart);
      } else {
        fromValue = [[resolved.layer() presentationLayer] valueForKeyPath:resolved.keyPath()];
        if (fromValue == nil) {
          fromValue = [resolved.layer() valueForKeyPath:resolved.keyPath()];
        }
        if (fromValue == nil) {
          return AnimationResultReason::CurrentValueUnavailable;
        }
      }
      preparedTracks.push_back({
          track.target,
          resolved.layer(),
          resolved.keyPath(),
          fromValue,
          objectFromValue(track.keyframes.front().value),
          timing,
          track.delayMs,
          track.durationMs,
          zeroDurationDelayNanoseconds,
      });
    }
    return std::make_unique<ApplePreparedNativeAnimation>(std::move(preparedTracks));
  }

  void start(
      const AnimationHandle &handle,
      std::unique_ptr<PreparedNativeAnimation> prepared,
      const std::vector<NativeTrackInterruption> &interruptions,
      NativeTrackTerminalCallback terminal) override
  {
    RCTAssertMainQueue();
    const CFTimeInterval mediaTime = CACurrentMediaTime();
    [CATransaction begin];
    [CATransaction setDisableActions:YES];
    for (const auto &interruption : interruptions) {
      remove(interruption.handle, interruption.target);
    }
    auto &applePrepared = static_cast<ApplePreparedNativeAnimation &>(*prepared);
    std::vector<AnimationTarget> completedZeroDurationTargets;
    for (const auto &track : applePrepared.tracks) {
      if (track.durationMs == 0) {
        startZeroDurationTrack(handle, track, terminal, completedZeroDurationTargets);
        continue;
      }

      const AnimationTarget target = track.target;
      const ActiveTrackKey activeKey{handle, target};
      NSString *key = coreAnimationKey(handle, target);
      const uint64_t token = nextToken_++;
      const std::weak_ptr<AppleNativeAnimationExecutor> weakExecutor = weak_from_this();
      CABasicAnimation *animation = [CABasicAnimation animationWithKeyPath:track.keyPath];
      animation.fromValue = track.fromValue;
      animation.toValue = track.toValue;
      animation.duration = track.durationMs / 1000.0;
      animation.beginTime = [track.layer convertTime:mediaTime fromLayer:nil] + track.delayMs / 1000.0;
      animation.timingFunction = track.timingFunction;
      animation.fillMode = kCAFillModeBackwards;
      animation.removedOnCompletion = YES;

      REANativeAnimationDelegate *delegate = [REANativeAnimationDelegate new];
      delegate.completion = ^(BOOL finished) {
        RCTAssertMainQueue();
        const auto executor = weakExecutor.lock();
        if (!executor) {
          return;
        }
        const auto activeIt = executor->active_.find(activeKey);
        if (activeIt == executor->active_.end() || activeIt->second.token != token) {
          return;
        }
        executor->active_.erase(activeIt);
        terminal(target, finished);
      };
      animation.delegate = delegate;

      active_[activeKey] = {track.layer, track.keyPath, token, true};
      [track.layer setValue:track.toValue forKeyPath:track.keyPath];
      [track.layer addAnimation:animation forKey:key];
    }
    [CATransaction commit];
    for (const auto target : completedZeroDurationTargets) {
      terminal(target, true);
    }
  }

  void cancel(const AnimationHandle &handle, const std::vector<AnimationTarget> &targets) override
  {
    RCTAssertMainQueue();
    [CATransaction begin];
    [CATransaction setDisableActions:YES];
    for (const auto target : targets) {
      remove(handle, target);
    }
    [CATransaction commit];
  }

  std::variant<std::vector<CapturedTargetValue>, AnimationResultReason> handoff(
      const AnimationHandle &handle,
      const std::vector<AnimationTarget> &targets) override
  {
    RCTAssertMainQueue();
    struct CapturedTrack {
      AnimationTarget target;
      __strong CALayer *layer;
      __strong NSString *keyPath;
      __strong id object;
      AnimationValue value;
    };

    std::vector<CapturedTrack> capturedTracks;
    capturedTracks.reserve(targets.size());
    for (const auto target : targets) {
      const auto it = active_.find({handle, target});
      if (it == active_.end()) {
        return AnimationResultReason::CurrentValueUnavailable;
      }
      id object = [[it->second.layer presentationLayer] valueForKeyPath:it->second.keyPath];
      if (object == nil) {
        object = [it->second.layer valueForKeyPath:it->second.keyPath];
      }
      const auto value = valueFromObject(object, target);
      if (!value) {
        return AnimationResultReason::CurrentValueUnavailable;
      }
      capturedTracks.push_back({target, it->second.layer, it->second.keyPath, object, *value});
    }

    std::vector<CapturedTargetValue> values;
    values.reserve(capturedTracks.size());
    [CATransaction begin];
    [CATransaction setDisableActions:YES];
    for (const auto &track : capturedTracks) {
      [track.layer setValue:track.object forKeyPath:track.keyPath];
      remove(handle, track.target);
      values.push_back({track.target, track.value});
    }
    [CATransaction commit];
    return values;
  }

 private:
  struct ActiveTrack {
    __strong CALayer *layer;
    __strong NSString *keyPath;
    uint64_t token;
    bool hasCoreAnimation;
  };

  bool applyZeroDurationEndpoint(const ActiveTrackKey &key, const uint64_t token, id toValue)
  {
    const auto activeIt = active_.find(key);
    if (activeIt == active_.end() || activeIt->second.token != token) {
      return false;
    }
    CALayer *layer = activeIt->second.layer;
    NSString *keyPath = activeIt->second.keyPath;
    active_.erase(activeIt);
    [layer setValue:toValue forKeyPath:keyPath];
    return true;
  }

  void startZeroDurationTrack(
      const AnimationHandle &handle,
      const PreparedTrack &track,
      const NativeTrackTerminalCallback &terminal,
      std::vector<AnimationTarget> &completedTargets)
  {
    const ActiveTrackKey activeKey{handle, track.target};
    const uint64_t token = nextToken_++;
    active_[activeKey] = {track.layer, track.keyPath, token, false};

    if (track.delayMs <= 0) {
      if (applyZeroDurationEndpoint(activeKey, token, track.toValue)) {
        completedTargets.push_back(track.target);
      }
      return;
    }

    const std::weak_ptr<AppleNativeAnimationExecutor> weakExecutor = weak_from_this();
    auto applyEndpoint = [weakExecutor, activeKey, token, toValue = track.toValue, terminal, target = track.target]() {
      RCTAssertMainQueue();
      const auto executor = weakExecutor.lock();
      if (!executor) {
        return;
      }
      [CATransaction begin];
      [CATransaction setDisableActions:YES];
      const bool applied = executor->applyZeroDurationEndpoint(activeKey, token, toValue);
      [CATransaction commit];
      if (applied) {
        terminal(target, true);
      }
    };
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, *track.zeroDurationDelayNanoseconds), dispatch_get_main_queue(), ^{
      applyEndpoint();
    });
  }

  void remove(const AnimationHandle &handle, const AnimationTarget target)
  {
    const auto it = active_.find({handle, target});
    if (it == active_.end()) {
      return;
    }
    CALayer *layer = it->second.layer;
    const bool hasCoreAnimation = it->second.hasCoreAnimation;
    active_.erase(it);
    if (hasCoreAnimation) {
      [layer removeAnimationForKey:coreAnimationKey(handle, target)];
    }
  }

  std::unordered_map<ActiveTrackKey, ActiveTrack, ActiveTrackKeyHash> active_;
  uint64_t nextToken_{1};
};

} // namespace

std::shared_ptr<NativeAnimationService> makeAppleNativeAnimationService(RCTSurfacePresenter *surfacePresenter)
{
  auto scheduler = std::make_shared<ApplePlatformUIScheduler>();
  auto resolver = std::make_shared<AppleNativeAnimationTargetResolver>(surfacePresenter);
  auto executor = std::make_shared<AppleNativeAnimationExecutor>();
  return makeNativeAnimationService(scheduler, resolver, executor);
}

} // namespace reanimated::native_animation
