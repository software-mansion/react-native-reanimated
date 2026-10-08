#import <reanimated/Tools/ReanimatedSystraceSection.h>
#import <reanimated/apple/NativeAnimations/REANativeAnimationPlatform.h>
#import <reanimated/apple/REASlowAnimations.h>
#import <reanimated/apple/REAUIView.h>

#import <React/RCTAssert.h>
#import <React/RCTComponentViewProtocol.h>
#import <React/RCTComponentViewRegistry.h>
#import <React/RCTConversions.h>
#import <React/RCTFabricSurface.h>
#import <React/RCTMountingManager.h>
#import <React/RCTUtils.h>
#import <react/renderer/components/view/ViewProps.h>
#import <react/renderer/components/view/ViewShadowNode.h>

#import <QuartzCore/QuartzCore.h>

#import <algorithm>
#import <cmath>
#import <cstring>
#import <iterator>
#import <ranges>
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
    case AnimationTarget::Transform:
      return @"transform";
  }
}

/// A perspective has no value function. A track holds one value for it.
CAValueFunctionName valueFunctionNameForKind(const TransformOperationKind kind)
{
  switch (kind) {
    case TransformOperationKind::TranslateX:
      return kCAValueFunctionTranslateX;
    case TransformOperationKind::TranslateY:
      return kCAValueFunctionTranslateY;
    case TransformOperationKind::Scale:
      return kCAValueFunctionScale;
    case TransformOperationKind::ScaleX:
      return kCAValueFunctionScaleX;
    case TransformOperationKind::ScaleY:
      return kCAValueFunctionScaleY;
    case TransformOperationKind::RotateX:
      return kCAValueFunctionRotateX;
    case TransformOperationKind::RotateY:
      return kCAValueFunctionRotateY;
    case TransformOperationKind::RotateZ:
      return kCAValueFunctionRotateZ;
    case TransformOperationKind::Perspective:
      return nil;
  }
}

/// The components whose picture with a transform track is equal to the picture of the frame driver.
bool playsTransform(const char *componentName)
{
  static constexpr const char *components[] = {"View", "Paragraph", "Image"};
  return std::ranges::any_of(
      components, [componentName](const char *component) { return std::strcmp(componentName, component) == 0; });
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

facebook::react::Transform matrixOf(const CATransform3D &transform)
{
  facebook::react::Transform matrix;
  const CGFloat cells[] = {
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
      transform.m44};
  std::copy(std::begin(cells), std::end(cells), matrix.matrix.begin());
  return matrix;
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

id objectFromTransform(const AnimationTransform &transform)
{
  return [NSValue valueWithCATransform3D:RCTCATransform3DFromTransformMatrix(matrixOf(transform))];
}

struct EndObjectVisitor {
  id operator()(const ValueTimeline &timeline) const
  {
    return objectFromValue(timeline.segments.back().endValue);
  }
  id operator()(const TransformTimelines &body) const
  {
    return objectFromTransform(endpointsOf(body).end);
  }
};

/// The model value that holds the end of the track.
id endObjectOf(const AnimationTrack &track)
{
  return std::visit(EndObjectVisitor{}, track.body);
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

struct ModelMatchesEndpointVisitor {
  id model;

  bool operator()(const ValueTimeline &timeline) const
  {
    return std::visit(ModelMatchesVisitor{model}, timeline.segments.back().endValue);
  }
  bool operator()(const TransformTimelines &body) const
  {
    return isSameMatrix(matrixOf([model CATransform3DValue]), matrixOf(endpointsOf(body).end));
  }
};

bool modelMatchesEndpoint(CALayer *layer, const AnimationTrack &track)
{
  id model = [layer valueForKeyPath:keyPathForTarget(track.target)];
  return model != nil && std::visit(ModelMatchesEndpointVisitor{model}, track.body);
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

/// React Native makes the matrix of a transform origin and of a percent translation from the size at the
/// mount.
bool hasSizeDependentTransform(const facebook::react::ViewProps &viewProps)
{
  using namespace facebook::react;
  return viewProps.transformOrigin.isSet() ||
      std::ranges::any_of(viewProps.transform.operations, [](const TransformOperation &operation) {
           return operation.x.unit == UnitType::Percent || operation.y.unit == UnitType::Percent;
         });
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
  return hasNoBorder && hasCircularRadii && viewProps.outlineWidth == 0 && viewProps.boxShadow.empty() &&
      hasOnlyOpacityFilters && viewProps.backgroundImage.empty() && viewProps.shadowOpacity == 0 &&
      !hasSizeDependentTransform(viewProps);
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

/// The value that React Native gives `allowsEdgeAntialiasing` with the transform of a view: the `transform`
/// block of `updateProps:oldProps:` in `RCTViewComponentView.mm`.
bool hasEdgeAntialiasingInReactNative(const CATransform3D &transform)
{
  return transform.m12 != 0 || transform.m21 != 0 || transform.m34 != 0;
}

/// A part of the time of a track, in offsets. The delay of the track is the part before 0.
struct TimeSpan {
  double start;
  double end;
};

/// The offset at which the delay of the track starts.
double delayStartOf(const AnimationTrack &track)
{
  return track.delayMs > 0 ? -1 : 0;
}

/// The spans of the time of the track in which a rotation about the axis has a value other than 0. In the delay
/// of the track each operation has its start value.
std::vector<TimeSpan> spansOfRotationAbout(const AnimationTrack &track, const TransformOperationKind axis)
{
  std::vector<TimeSpan> spans;
  for (const OperationTimeline &operation : std::get<TransformTimelines>(track.body).operations) {
    if (operation.kind != axis) {
      continue;
    }
    double startOffset = delayStartOf(track);
    double startValue = operation.start;
    const auto addSpanTo = [&](const double endOffset, const double endValue) {
      if (startOffset < endOffset && (startValue != 0 || endValue != 0)) {
        spans.push_back({.start = startOffset, .end = endOffset});
      }
      startOffset = endOffset;
      startValue = endValue;
    };
    addSpanTo(0, operation.start);
    for (const auto &segment : operation.segments) {
      addSpanTo(segment.endOffset, segment.endValue);
    }
  }
  return spans;
}

std::vector<TimeSpan> timeInCommon(const std::vector<TimeSpan> &spans, const std::vector<TimeSpan> &otherSpans)
{
  std::vector<TimeSpan> common;
  for (const TimeSpan &span : spans) {
    for (const TimeSpan &other : otherSpans) {
      const TimeSpan overlap{.start = std::max(span.start, other.start), .end = std::min(span.end, other.end)};
      if (overlap.start < overlap.end) {
        common.push_back(overlap);
      }
    }
  }
  return common;
}

/// The spans of the time of the track in which the transform has a rotation about the Z axis, a perspective,
/// or rotations about the X and the Y axes at one time, in the order of their starts. The frame driver writes
/// such a transform to the model, and React Native gives it edge antialiasing.
std::vector<TimeSpan> spansWithEdgeAntialiasingInFrameDriver(const AnimationTrack &track)
{
  const auto *body = std::get_if<TransformTimelines>(&track.body);
  if (body == nullptr) {
    return {};
  }
  const bool hasPerspective = std::ranges::any_of(body->operations, [](const OperationTimeline &operation) {
    return operation.kind == TransformOperationKind::Perspective;
  });
  if (hasPerspective) {
    return {{.start = delayStartOf(track), .end = 1}};
  }
  auto spans = spansOfRotationAbout(track, TransformOperationKind::RotateZ);
  std::ranges::copy(
      timeInCommon(
          spansOfRotationAbout(track, TransformOperationKind::RotateX),
          spansOfRotationAbout(track, TransformOperationKind::RotateY)),
      std::back_inserter(spans));
  std::ranges::sort(spans, {}, &TimeSpan::start);
  return spans;
}

/// True when the spans, in the order of their starts, have each time of `span` between them.
bool isInside(const TimeSpan &span, const std::vector<TimeSpan> &spans)
{
  double coveredTo = span.start;
  for (const TimeSpan &each : spans) {
    if (each.start > coveredTo) {
      break;
    }
    coveredTo = std::max(coveredTo, each.end);
  }
  return coveredTo >= span.end;
}

/// A layer has one value of edge antialiasing for the time of a track and its delay, and the frame driver has
/// one for each frame. False when the frame driver has edge antialiasing in only a part of that time: the
/// edges of the view differ in the other part.
bool hasEdgesOfFrameDriver(const AnimationTrack &track)
{
  const auto spans = spansWithEdgeAntialiasingInFrameDriver(track);
  return spans.empty() || isInside({.start = delayStartOf(track), .end = 1}, spans);
}

/// The edge antialiasing that a `Transform` track gives its layer, as the frame driver has it.
struct TrackEdgeAntialiasing {
  /// For the time of the track and its delay.
  bool duringTrack{false};
  /// While the track holds its end value after that time.
  bool atHeldEnd{false};
};

TrackEdgeAntialiasing edgeAntialiasingOf(const AnimationTrack &track)
{
  if (track.target != AnimationTarget::Transform) {
    return {};
  }
  return {
      .duringTrack = !spansWithEdgeAntialiasingInFrameDriver(track).empty(),
      .atHeldEnd = hasEdgeAntialiasingInReactNative([endObjectOf(track) CATransform3DValue])};
}

#ifndef NDEBUG
std::vector<double> componentsOfValue(id value)
{
  if ([value isKindOfClass:[NSNumber class]]) {
    return {[value doubleValue]};
  }
  if ([value isKindOfClass:[NSArray class]]) {
    std::vector<double> components;
    for (NSNumber *number in value) {
      components.push_back(number.doubleValue);
    }
    return components;
  }
  if (![value isKindOfClass:[NSValue class]]) {
    return {};
  }
  const char *type = [value objCType];
  if (strcmp(type, @encode(CATransform3D)) == 0) {
    const auto matrix = matrixOf([value CATransform3DValue]).matrix;
    return {matrix.begin(), matrix.end()};
  }
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

std::vector<PlaybackMember> playbackMembers(CALayer *layer, const AnimationTarget target)
{
  NSString *targetSuffix = [NSString stringWithFormat:@".%u", static_cast<unsigned>(target)];
  std::vector<PlaybackMember> members;
  for (NSString *key in layer.animationKeys) {
    if (![key hasPrefix:kAnimationKeyPrefix] || ![key hasSuffix:targetSuffix]) {
      continue;
    }
    CAAnimation *playback = [layer animationForKey:key];
    NSArray<CAAnimation *> *animations =
        [playback isKindOfClass:[CAAnimationGroup class]] ? ((CAAnimationGroup *)playback).animations : @[ playback ];
    for (CAKeyframeAnimation *animation in animations) {
      NSString *function = animation.valueFunction.name;
      NSString *property =
          function == nil ? animation.keyPath : [NSString stringWithFormat:@"%@.%@", animation.keyPath, function];
      PlaybackMember member{.property = property.UTF8String};
      for (id value in animation.values) {
        member.values.push_back(componentsOfValue(value));
      }
      for (NSNumber *keyTime in animation.keyTimes) {
        member.keyTimes.push_back(keyTime.doubleValue);
      }
      members.push_back(std::move(member));
    }
  }
  return members;
}
#endif // NDEBUG

/// One physical animation of a track. It has one value, at one key time, for the start of its timeline and
/// for the end of each segment.
struct TrackMember {
  NSString *keyPath;
  NSArray *values;
  NSArray<NSNumber *> *keyTimes;
  NSArray<CAMediaTimingFunction *> *timingFunctions;
  bool isAdditive{false};
  CAValueFunction *valueFunction{nil};
};

CAKeyframeAnimation *makePropertyAnimation(const TrackMember &member)
{
  CAKeyframeAnimation *animation = [CAKeyframeAnimation animationWithKeyPath:member.keyPath];
  animation.values = member.values;
  animation.keyTimes = member.keyTimes;
  animation.timingFunctions = member.timingFunctions;
  animation.additive = member.isAdditive;
  animation.valueFunction = member.valueFunction;
  return animation;
}

/// The key times and the timing functions of the segments of one timeline.
struct TimelineKeys {
  NSMutableArray<NSNumber *> *times = [NSMutableArray arrayWithObject:@0];
  NSMutableArray<CAMediaTimingFunction *> *timingFunctions = [NSMutableArray array];
};

template <typename Value>
TimelineKeys keysOf(const std::vector<TimelineSegment<Value>> &segments)
{
  TimelineKeys keys;
  for (const auto &segment : segments) {
    [keys.times addObject:@(segment.endOffset)];
    [keys.timingFunctions addObject:std::visit(TimingFunctionVisitor{}, segment.timingFromPrevious)];
  }
  return keys;
}

TrackMember makeOffsetMember(const TrackMember &member, NSString *keyPath, const double model, const double scale)
{
  NSMutableArray<NSNumber *> *offsets = [NSMutableArray arrayWithCapacity:member.values.count];
  for (NSNumber *value in member.values) {
    [offsets addObject:@((value.doubleValue - model) * scale)];
  }
  return {
      .keyPath = keyPath,
      .values = offsets,
      .keyTimes = member.keyTimes,
      .timingFunctions = member.timingFunctions,
      .isAdditive = true};
}

/// A member that holds `transform` for the time of its track.
TrackMember makeHeldTransformMember(const AnimationTransform &transform, const bool isAdditive)
{
  id matrix = objectFromTransform(transform);
  return
  {
    .keyPath = keyPathForTarget(AnimationTarget::Transform), .values = @[ matrix, matrix ], .keyTimes = @[ @0, @1 ],
    .timingFunctions = @[ TimingFunctionVisitor{}(LinearTiming{}) ], .isAdditive = isAdditive
  };
}

TrackMember makeOperationMember(const OperationTimeline &operation, const bool holdsStartValue)
{
  const bool changesValue = std::ranges::any_of(
      operation.segments, [&operation](const auto &segment) { return segment.endValue != operation.start; });
  if (holdsStartValue || !changesValue) {
    return makeHeldTransformMember(AnimationTransform{{{operation.kind, operation.start}}}, true);
  }
  const bool hasThreeFactors = operation.kind == TransformOperationKind::Scale;
  const auto objectOf = [hasThreeFactors](const double value) -> id {
    return hasThreeFactors ? @[ @(value), @(value), @(value) ] : @(value);
  };
  NSMutableArray *values = [NSMutableArray arrayWithObject:objectOf(operation.start)];
  for (const auto &segment : operation.segments) {
    [values addObject:objectOf(segment.endValue)];
  }
  const auto keys = keysOf(operation.segments);
  return {
      .keyPath = keyPathForTarget(AnimationTarget::Transform),
      .values = values,
      .keyTimes = keys.times,
      .timingFunctions = keys.timingFunctions,
      .isAdditive = true,
      .valueFunction = [CAValueFunction functionWithName:valueFunctionNameForKind(operation.kind)]};
}

/// The first member hides the model and each animation before it. The screen applies the members after it to
/// a point in their order, and a style transform applies its last operation first.
std::vector<TrackMember> makeTransformMembers(const TransformTimelines &body, const bool holdsStartValue)
{
  std::vector<TrackMember> members{makeHeldTransformMember(AnimationTransform{}, false)};
  for (const auto &operation : std::views::reverse(body.operations)) {
    members.push_back(makeOperationMember(operation, holdsStartValue));
  }
  return members;
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
    id operator()(const ValueTimeline &timeline) const
    {
      return std::visit(*this, timeline.start);
    }
    id operator()(const TransformTimelines &body) const
    {
      return objectFromTransform(endpointsOf(body).start);
    }
  };

  CAAnimation *makeAnimation(const AnimationTrack &track, id startValue) const;
  std::vector<TrackMember> makeMembers(const AnimationTrack &track, id startValue) const;
  std::vector<TrackMember> makeValueMembers(AnimationTarget target, const TrackMember &member) const;

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
    if (!changesValue(track)) {
      return true;
    }
    if (changesSize) {
      return std::strcmp(view.componentName, ViewComponentName) == 0 &&
          pictureFollowsBounds(viewProps, view.layoutMetrics);
    }
    if (track.target == AnimationTarget::Transform) {
      return playsTransform(view.componentName) && !hasSizeDependentTransform(viewProps) &&
          hasEdgesOfFrameDriver(track);
    }
    return true;
  }

  bool isSurfaceRunning(const SurfaceId surfaceId) override
  {
    RCTAssertMainQueue();
    RCTFabricSurface *surface = [surfacePresenter_ surfaceForRootTag:surfaceId];
    return surface != nil && RCTSurfaceStageIsRunning(surface.stage);
  }

  bool isInWindow(const Tag tag) override
  {
    RCTAssertMainQueue();
    return mountedView(tag).window != nil;
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
    NSString *keyPath = keyPathForTarget(track.target);
    [CATransaction begin];
    [CATransaction setDisableActions:YES];
    // A layer that left its view tag can already serve another component, so its model stays as it is.
    if (mode == TrackStopMode::KeepVisibleValue && mountedLayer(track.handle.tag) == layer) {
      [layer setValue:currentVisualValue(layer, keyPath) forKeyPath:keyPath];
    }
    release(trackIt);
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
        playbackKeys(layer),
        playbackMembers(layer, target),
        layer.allowsEdgeAntialiasing == YES};
  }
#endif

  void replace(const TrackKey &track)
  {
    const auto trackIt = tracks_.find(track);
    if (trackIt == tracks_.end()) {
      return;
    }
    CALayer *layer = release(trackIt);
    [layer removeAnimationForKey:animationKeyForTrack(track)];
  }

  // A block captures a C++ reference as a reference, so the key comes by value.
  void play(
      const TrackKey track,
      CALayer *layer,
      CAAnimation *animation,
      const bool holdsEndValue,
      const TrackEdgeAntialiasing edgeAntialiasing)
  {
    const auto weakThis = weak_from_this();
    animation.delegate = [[REANativeAnimationDelegate alloc] initWithStopHandler:^(BOOL finished) {
      if (const auto strongThis = weakThis.lock()) {
        strongThis->onAnimationStopped(track, finished, holdsEndValue, edgeAntialiasing.atHeldEnd);
      }
    }];
    tracks_.emplace(track, layer);
    if (edgeAntialiasing.duringTrack) {
      layer.allowsEdgeAntialiasing = YES;
    }
    [layer addAnimation:animation forKey:animationKeyForTrack(track)];
  }

 private:
  using Tracks = std::unordered_map<TrackKey, __strong CALayer *, TrackKeyHash>;

  /// Takes a track from its layer. A `Transform` track can show a transform with edge antialiasing on a
  /// layer whose model transform has none, so `play` gives the layer edge antialiasing for the time of such
  /// a track. After that time, the layer has the value of React Native for its model transform.
  CALayer *release(const Tracks::iterator trackIt)
  {
    CALayer *layer = trackIt->second;
    const bool hasTransformTarget = trackIt->first.target == AnimationTarget::Transform;
    tracks_.erase(trackIt);
    if (hasTransformTarget) {
      layer.allowsEdgeAntialiasing = hasEdgeAntialiasingInReactNative(layer.transform);
    }
    return layer;
  }

  REAUIView<RCTComponentViewProtocol> *mountedView(const Tag tag) const
  {
    return [surfacePresenter_.mountingManager.componentViewRegistry findComponentViewWithTag:tag];
  }

  CALayer *mountedLayer(const Tag tag) const
  {
    return mountedView(tag).layer;
  }

  void onAnimationStopped(
      const TrackKey &track,
      const bool finished,
      const bool holdsEndValue,
      const bool hasEdgeAntialiasingAtHeldEnd)
  {
    RCTAssertMainQueue();
    const auto trackIt = tracks_.find(track);
    if (trackIt == tracks_.end()) {
      return;
    }
    if (finished && holdsEndValue) {
      if (track.target == AnimationTarget::Transform) {
        // The layer shows the end value of the track until the release of the track.
        trackIt->second.allowsEdgeAntialiasing = hasEdgeAntialiasingAtHeldEnd;
      }
    } else {
      CALayer *layer = release(trackIt);
      if (holdsEndValue) {
        // Core Animation stops an animation that holds its end value but keeps it on the layer.
        [layer removeAnimationForKey:animationKeyForTrack(track)];
      }
    }
    trackEndListener_(track, finished);
  }

  __weak RCTSurfacePresenter *surfacePresenter_;
  TrackEndListener trackEndListener_;
  Tracks tracks_;
};

std::optional<AnimationResultReason> CoreAnimationMountedAnimation::prepare(
    const std::vector<AnimationTarget> &interruptedTargets)
{
  startValues_.reserve(request_.tracks.size());
  for (const auto &track : request_.tracks) {
    const bool isInterrupting =
        std::find(interruptedTargets.begin(), interruptedTargets.end(), track.target) != interruptedTargets.end();
    id startValue = std::visit(StartValueVisitor{layer_, keyPathForTarget(track.target), isInterrupting}, track.body);
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
    if (track.endpointPolicy == EndpointPolicy::ExecutorCommitsEndpoint) {
      [layer_ setValue:endObjectOf(track) forKeyPath:keyPathForTarget(track.target)];
    }
    platform_.play(
        {request_.handle, track.target},
        layer_,
        makeAnimation(track, startValues_[index]),
        track.endpointPolicy == EndpointPolicy::HoldWithoutCommit,
        edgeAntialiasingOf(track));
  }
  [CATransaction commit];
}

CAAnimation *CoreAnimationMountedAnimation::makeAnimation(const AnimationTrack &track, id startValue) const
{
  const bool holdsEndValue = track.endpointPolicy == EndpointPolicy::HoldWithoutCommit;
  const bool holdsStartValue = playbackOf(track) == TrackPlayback::HeldThroughDelay;
  const CFTimeInterval origin = calculateMediaTimeFromSlowAnimationsTimestamp(request_.originTimestampMs / 1000.0);
  const CFTimeInterval delay = calculateMediaDurationFromSlowAnimationsDuration(track.delayMs / 1000.0);
  // The layer clock can differ from the media clock when an ancestor changes speed or time offset.
  const CFTimeInterval layerOrigin = [layer_ convertTime:origin fromLayer:nil];
  const CFTimeInterval duration =
      holdsStartValue ? delay : calculateMediaDurationFromSlowAnimationsDuration(track.durationMs / 1000.0);

  NSMutableArray<CAAnimation *> *members = [NSMutableArray array];
  for (const auto &member : makeMembers(track, startValue)) {
    CAKeyframeAnimation *memberAnimation = makePropertyAnimation(member);
    memberAnimation.duration = duration;
    memberAnimation.fillMode = kCAFillModeBoth;
    [members addObject:memberAnimation];
  }
  CAAnimation *animation = members.firstObject;
  if (members.count > 1) {
    CAAnimationGroup *group = [CAAnimationGroup animation];
    group.animations = members;
    animation = group;
  }
  animation.duration = duration;
  animation.beginTime = holdsStartValue ? layerOrigin : layerOrigin + delay;
  animation.fillMode = holdsEndValue ? kCAFillModeBoth : kCAFillModeBackwards;
  animation.removedOnCompletion = !holdsEndValue;
  return animation;
}

std::vector<TrackMember> CoreAnimationMountedAnimation::makeMembers(const AnimationTrack &track, id startValue) const
{
  const bool holdsStartValue = playbackOf(track) == TrackPlayback::HeldThroughDelay;
  if (const auto *body = std::get_if<TransformTimelines>(&track.body)) {
    return makeTransformMembers(*body, holdsStartValue);
  }
  const auto &segments = std::get<ValueTimeline>(track.body).segments;
  NSMutableArray *values = [NSMutableArray arrayWithObject:startValue];
  for (const auto &segment : segments) {
    [values addObject:holdsStartValue ? startValue : objectFromValue(segment.endValue)];
  }
  const auto keys = keysOf(segments);
  return makeValueMembers(
      track.target,
      {.keyPath = keyPathForTarget(track.target),
       .values = values,
       .keyTimes = keys.times,
       .timingFunctions = keys.timingFunctions});
}

/// A position plays as an offset from the model, because a value animation hides the animations of its key
/// path that begin before it. A size moves the position by half of its offset, so the frame origin stays.
std::vector<TrackMember> CoreAnimationMountedAnimation::makeValueMembers(
    const AnimationTarget target,
    const TrackMember &member) const
{
  const auto model = [this, &member] {
    return [[layer_ valueForKeyPath:member.keyPath] doubleValue];
  };
  switch (target) {
    case AnimationTarget::PositionX:
    case AnimationTarget::PositionY:
      return {makeOffsetMember(member, member.keyPath, model(), 1)};
    case AnimationTarget::Width:
    case AnimationTarget::Height: {
      NSString *positionKeyPath =
          keyPathForTarget(target == AnimationTarget::Width ? AnimationTarget::PositionX : AnimationTarget::PositionY);
      return {member, makeOffsetMember(member, positionKeyPath, model(), 0.5)};
    }
    default:
      return {member};
  }
}

} // namespace

std::shared_ptr<NativeAnimationPlatform> makeCoreAnimationPlatform(RCTSurfacePresenter *surfacePresenter)
{
  return std::make_shared<CoreAnimationPlatform>(surfacePresenter);
}

} // namespace reanimated::native_animation
