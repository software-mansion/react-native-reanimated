#import <reanimated/apple/NativeAnimations/REANativeAnimationFactory.h>

#import <cmath>
#import <type_traits>
#import <variant>

using namespace reanimated;

namespace {

CAMediaTimingFunction *timingFunction(const NativeTimingFunction &function)
{
  if (function.kind == NativeTimingFunctionKind::Linear) {
    return [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionLinear];
  }
  const auto &points = function.controlPoints;
  const auto x1 = static_cast<float>(points[0]);
  const auto y1 = static_cast<float>(points[1]);
  const auto x2 = static_cast<float>(points[2]);
  const auto y2 = static_cast<float>(points[3]);
  return [CAMediaTimingFunction functionWithControlPoints:x1:y1:x2:y2];
}

NSString *targetName(const NativeAnimationTarget target)
{
  switch (target) {
    case NativeAnimationTarget::Opacity:
      return @"opacity";
    case NativeAnimationTarget::OriginX:
      return @"originX";
    case NativeAnimationTarget::OriginY:
      return @"originY";
    case NativeAnimationTarget::Position:
      return @"position";
    case NativeAnimationTarget::Width:
      return @"width";
    case NativeAnimationTarget::Height:
      return @"height";
    case NativeAnimationTarget::BoundsSize:
      return @"boundsSize";
    case NativeAnimationTarget::Transform:
      return @"transform";
    default:
      return nil;
  }
}

NSString *ownershipTargetName(const NativeAnimationTarget target)
{
  switch (target) {
    case NativeAnimationTarget::Opacity:
      return @"opacity";
    case NativeAnimationTarget::OriginX:
      return @"positionX";
    case NativeAnimationTarget::OriginY:
      return @"positionY";
    case NativeAnimationTarget::Position:
      return @"position";
    case NativeAnimationTarget::Width:
      return @"boundsWidth";
    case NativeAnimationTarget::Height:
      return @"boundsHeight";
    case NativeAnimationTarget::BoundsSize:
      return @"boundsSize";
    default:
      return @"transform";
  }
}

NSString *keyPath(const NativeAnimationTarget target)
{
  switch (target) {
    case NativeAnimationTarget::Opacity:
      return @"opacity";
    case NativeAnimationTarget::OriginX:
      return @"position.x";
    case NativeAnimationTarget::OriginY:
      return @"position.y";
    case NativeAnimationTarget::Position:
      return @"position";
    case NativeAnimationTarget::Width:
      return @"bounds.size.width";
    case NativeAnimationTarget::Height:
      return @"bounds.size.height";
    case NativeAnimationTarget::BoundsSize:
      return @"bounds.size";
    case NativeAnimationTarget::Transform:
      return @"transform";
    default:
      return nil;
  }
}

id platformValue(const NativeValue &value, const NativeAnimationTarget target, CALayer *layer)
{
  if (const auto *scalar = std::get_if<double>(&value)) {
    switch (target) {
      case NativeAnimationTarget::Opacity:
      case NativeAnimationTarget::Width:
      case NativeAnimationTarget::Height:
        return @(*scalar);
      case NativeAnimationTarget::OriginX:
        return @(*scalar + layer.anchorPoint.x * layer.bounds.size.width);
      case NativeAnimationTarget::OriginY:
        return @(*scalar + layer.anchorPoint.y * layer.bounds.size.height);
      default:
        return nil;
    }
  }
  if (const auto *point = std::get_if<NativePoint>(&value);
      point != nullptr && target == NativeAnimationTarget::Position) {
    return [NSValue valueWithCGPoint:CGPointMake(point->x, point->y)];
  }
  if (const auto *size = std::get_if<NativeSize>(&value);
      size != nullptr && target == NativeAnimationTarget::BoundsSize) {
    return [NSValue valueWithCGSize:CGSizeMake(size->width, size->height)];
  }
  if (const auto *matrix = std::get_if<NativeMatrix4>(&value);
      matrix != nullptr && target == NativeAnimationTarget::Transform) {
    const auto &m = matrix->values;
    return [NSValue valueWithCATransform3D:CATransform3D{
                                               static_cast<CGFloat>(m[0]),
                                               static_cast<CGFloat>(m[1]),
                                               static_cast<CGFloat>(m[2]),
                                               static_cast<CGFloat>(m[3]),
                                               static_cast<CGFloat>(m[4]),
                                               static_cast<CGFloat>(m[5]),
                                               static_cast<CGFloat>(m[6]),
                                               static_cast<CGFloat>(m[7]),
                                               static_cast<CGFloat>(m[8]),
                                               static_cast<CGFloat>(m[9]),
                                               static_cast<CGFloat>(m[10]),
                                               static_cast<CGFloat>(m[11]),
                                               static_cast<CGFloat>(m[12]),
                                               static_cast<CGFloat>(m[13]),
                                               static_cast<CGFloat>(m[14]),
                                               static_cast<CGFloat>(m[15]),
                                           }];
  }
  return nil;
}

struct KeyframeData {
  NSMutableArray *values{[NSMutableArray array]};
  NSMutableArray<NSNumber *> *timesMs{[NSMutableArray array]};
  NSMutableArray<CAMediaTimingFunction *> *timingFunctions{[NSMutableArray array]};
};

bool appendValue(
    KeyframeData &data,
    const double timeMs,
    id value,
    CAMediaTimingFunction *_Nullable precedingTimingFunction)
{
  if (value == nil || !std::isfinite(timeMs)) {
    return false;
  }
  if (data.timesMs.count == 0) {
    [data.timesMs addObject:@(timeMs)];
    [data.values addObject:value];
    return true;
  }

  const double lastTimeMs = data.timesMs.lastObject.doubleValue;
  if (timeMs < lastTimeMs) {
    return false;
  }
  if (timeMs == lastTimeMs) {
    data.values[data.values.count - 1] = value;
    return true;
  }
  [data.timingFunctions
      addObject:precedingTimingFunction ?: [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionLinear]];
  [data.timesMs addObject:@(timeMs)];
  [data.values addObject:value];
  return true;
}

bool appendSegment(
    KeyframeData &data,
    const NativeAnimationSegment &segment,
    const NativeAnimationTarget target,
    CALayer *layer)
{
  return std::visit(
      [&](const auto &typedSegment) {
        using T = std::decay_t<decltype(typedSegment)>;
        if constexpr (std::is_same_v<T, NativeTimingSegment>) {
          id from = platformValue(typedSegment.from, target, layer);
          id to = platformValue(typedSegment.to, target, layer);
          return appendValue(data, typedSegment.startMs, from, nil) &&
              appendValue(data, typedSegment.endMs, to, timingFunction(typedSegment.easing));
        } else if constexpr (std::is_same_v<T, NativeHoldSegment>) {
          id value = platformValue(typedSegment.value, target, layer);
          return appendValue(data, typedSegment.startMs, value, nil) &&
              appendValue(
                     data,
                     typedSegment.endMs,
                     value,
                     [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionLinear]);
        } else {
          if (typedSegment.values.size() != typedSegment.timesMs.size() || typedSegment.values.empty()) {
            return false;
          }
          for (size_t index = 0; index < typedSegment.values.size(); index++) {
            CAMediaTimingFunction *preceding = nil;
            if (index > 0 && typedSegment.mode == NativeInterpolationMode::Linear) {
              const auto easingIndex = index - 1;
              preceding = easingIndex < typedSegment.segmentEasings.size()
                  ? timingFunction(typedSegment.segmentEasings[easingIndex])
                  : [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionLinear];
            }
            if (!appendValue(
                    data,
                    typedSegment.timesMs[index],
                    platformValue(typedSegment.values[index], target, layer),
                    preceding)) {
              return false;
            }
          }
          return typedSegment.mode == NativeInterpolationMode::Linear;
        }
      },
      segment);
}

} // namespace

@implementation REANativeAnimationFactory

+ (nullable REANativeAnimationTrack *)animationForTrack:(const NativeAnimationTrack &)track
                                         planDurationMs:(const double)planDurationMs
                                                  layer:(CALayer *)layer
                                         localBeginTime:(const CFTimeInterval)localBeginTime
{
  NSString *resolvedKeyPath = keyPath(track.target);
  NSString *resolvedTargetName = targetName(track.target);
  if (resolvedKeyPath == nil || resolvedTargetName == nil || track.segments.empty() || planDurationMs <= 0) {
    return nil;
  }

  if (track.segments.size() == 1) {
    if (const auto *segment = std::get_if<NativeTimingSegment>(&track.segments.front());
        segment != nullptr && segment->startMs == 0 && segment->endMs > 0) {
      id from = platformValue(segment->from, track.target, layer);
      id to = platformValue(segment->to, track.target, layer);
      if (from == nil || to == nil) {
        return nil;
      }
      CABasicAnimation *animation = [CABasicAnimation animationWithKeyPath:resolvedKeyPath];
      animation.fromValue = from;
      animation.toValue = to;
      animation.beginTime = localBeginTime;
      animation.timeOffset = track.initialTimeOffsetMs / 1000.0;
      animation.duration = segment->endMs / 1000.0;
      animation.timingFunction = timingFunction(segment->easing);
      animation.removedOnCompletion = YES;
      animation.fillMode = kCAFillModeRemoved;
      return [[REANativeAnimationTrack alloc] initWithAnimation:animation
                                                        keyPath:resolvedKeyPath
                                                     targetName:resolvedTargetName
                                            ownershipTargetName:ownershipTargetName(track.target)];
    }
  }

  KeyframeData data;
  for (const auto &segment : track.segments) {
    if (!appendSegment(data, segment, track.target, layer)) {
      return nil;
    }
  }
  if (data.values.count < 2 || data.timingFunctions.count != data.values.count - 1) {
    return nil;
  }
  if (data.timesMs.firstObject.doubleValue > 0) {
    [data.timesMs insertObject:@0 atIndex:0];
    [data.values insertObject:data.values.firstObject atIndex:0];
    [data.timingFunctions insertObject:[CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionLinear] atIndex:0];
  }
  if (data.timesMs.lastObject.doubleValue < planDurationMs) {
    [data.timesMs addObject:@(planDurationMs)];
    [data.values addObject:data.values.lastObject];
    [data.timingFunctions addObject:[CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionLinear]];
  }

  NSMutableArray<NSNumber *> *keyTimes = [NSMutableArray arrayWithCapacity:data.timesMs.count];
  for (NSNumber *timeMs in data.timesMs) {
    [keyTimes addObject:@(timeMs.doubleValue / planDurationMs)];
  }

  CAKeyframeAnimation *animation = [CAKeyframeAnimation animationWithKeyPath:resolvedKeyPath];
  animation.values = data.values;
  animation.keyTimes = keyTimes;
  animation.timingFunctions = data.timingFunctions;
  animation.calculationMode = kCAAnimationLinear;
  animation.beginTime = localBeginTime;
  animation.timeOffset = track.initialTimeOffsetMs / 1000.0;
  animation.duration = planDurationMs / 1000.0;
  animation.removedOnCompletion = YES;
  animation.fillMode = kCAFillModeRemoved;
  return [[REANativeAnimationTrack alloc] initWithAnimation:animation
                                                    keyPath:resolvedKeyPath
                                                 targetName:resolvedTargetName
                                        ownershipTargetName:ownershipTargetName(track.target)];
}

@end
