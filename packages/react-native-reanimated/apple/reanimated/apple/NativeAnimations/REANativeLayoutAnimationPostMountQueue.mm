#import <reanimated/apple/NativeAnimations/REANativeLayoutAnimationPostMountQueue.h>

#import <React/RCTAssert.h>
#import <React/RCTComponent.h>
#import <React/RCTComponentViewRegistry.h>
#import <React/RCTMountingManager.h>
#import <reanimated/apple/REAUIView.h>

#import <cmath>
#import <optional>
#import <unordered_map>
#import <utility>
#import <variant>
#import <vector>

using namespace facebook::react;
using namespace reanimated;

namespace {

constexpr CGFloat kGeometryTolerance = 0.5;

struct ExpectedGeometry {
  std::optional<CGFloat> originX;
  std::optional<CGFloat> originY;
  std::optional<CGFloat> positionX;
  std::optional<CGFloat> positionY;
  std::optional<CGFloat> width;
  std::optional<CGFloat> height;
};

struct PendingStart {
  NativeAnimationMountingMode mountingMode;
  ExpectedGeometry expectedGeometry;
  std::function<void()> start;
  std::function<void()> reject;
};

std::optional<NativeValue> finalValue(const NativeAnimationTrack &track)
{
  if (track.segments.empty()) {
    return std::nullopt;
  }
  return std::visit(
      [](const auto &segment) -> std::optional<NativeValue> {
        using T = std::decay_t<decltype(segment)>;
        if constexpr (std::is_same_v<T, NativeTimingSegment>) {
          return segment.to;
        } else if constexpr (std::is_same_v<T, NativeHoldSegment>) {
          return segment.value;
        } else {
          return segment.values.empty() ? std::nullopt : std::optional<NativeValue>{segment.values.back()};
        }
      },
      track.segments.back());
}

ExpectedGeometry expectedGeometry(const NativeAnimationPlan &plan)
{
  ExpectedGeometry expected;
  if (plan.finalGeometry) {
    expected.originX = static_cast<CGFloat>(plan.finalGeometry->originX);
    expected.originY = static_cast<CGFloat>(plan.finalGeometry->originY);
    expected.width = static_cast<CGFloat>(plan.finalGeometry->width);
    expected.height = static_cast<CGFloat>(plan.finalGeometry->height);
  }
  for (const auto &track : plan.tracks) {
    const auto value = finalValue(track);
    if (!value) {
      continue;
    }
    if (const auto *scalar = std::get_if<double>(&*value)) {
      switch (track.target) {
        case NativeAnimationTarget::OriginX:
          expected.originX = static_cast<CGFloat>(*scalar);
          break;
        case NativeAnimationTarget::OriginY:
          expected.originY = static_cast<CGFloat>(*scalar);
          break;
        case NativeAnimationTarget::Width:
          expected.width = static_cast<CGFloat>(*scalar);
          break;
        case NativeAnimationTarget::Height:
          expected.height = static_cast<CGFloat>(*scalar);
          break;
        default:
          break;
      }
    } else if (const auto *point = std::get_if<NativePoint>(&*value);
               point != nullptr && track.target == NativeAnimationTarget::Position) {
      expected.positionX = static_cast<CGFloat>(point->x);
      expected.positionY = static_cast<CGFloat>(point->y);
    } else if (const auto *size = std::get_if<NativeSize>(&*value);
               size != nullptr && track.target == NativeAnimationTarget::BoundsSize) {
      expected.width = static_cast<CGFloat>(size->width);
      expected.height = static_cast<CGFloat>(size->height);
    }
  }
  return expected;
}

bool approximatelyEqual(CGFloat lhs, CGFloat rhs)
{
  return std::abs(lhs - rhs) <= kGeometryTolerance;
}

bool belongsToSurface(UIView *view, SurfaceId surfaceId)
{
  for (UIView *ancestor = view; ancestor != nil; ancestor = ancestor.superview) {
    if (ancestor.tag == surfaceId && RCTIsReactRootView(@(ancestor.tag))) {
      return true;
    }
  }
  return false;
}

bool modelMatchesFinalGeometry(CALayer *layer, const ExpectedGeometry &expected)
{
  const CGFloat width = expected.width.value_or(layer.bounds.size.width);
  const CGFloat height = expected.height.value_or(layer.bounds.size.height);

  if (expected.width && !approximatelyEqual(layer.bounds.size.width, *expected.width)) {
    return false;
  }
  if (expected.height && !approximatelyEqual(layer.bounds.size.height, *expected.height)) {
    return false;
  }
  if (expected.originX) {
    const CGFloat expectedPositionX = *expected.originX + layer.anchorPoint.x * width;
    if (!approximatelyEqual(layer.position.x, expectedPositionX)) {
      return false;
    }
  }
  if (expected.originY) {
    const CGFloat expectedPositionY = *expected.originY + layer.anchorPoint.y * height;
    if (!approximatelyEqual(layer.position.y, expectedPositionY)) {
      return false;
    }
  }
  if (expected.positionX && !approximatelyEqual(layer.position.x, *expected.positionX)) {
    return false;
  }
  if (expected.positionY && !approximatelyEqual(layer.position.y, *expected.positionY)) {
    return false;
  }
  return true;
}

} // namespace

@implementation REANativeLayoutAnimationPostMountQueue {
  __weak RCTSurfacePresenter *_surfacePresenter;
  std::unordered_map<NativeAnimationHandle, PendingStart, NativeAnimationHandleHash> _pendingStarts;
}

- (instancetype)initWithSurfacePresenter:(RCTSurfacePresenter *)surfacePresenter
{
  if (self = [super init]) {
    _surfacePresenter = surfacePresenter;
    [surfacePresenter addObserver:self];
  }
  return self;
}

- (void)dealloc
{
  RCTSurfacePresenter *surfacePresenter = _surfacePresenter;
  if (surfacePresenter) {
    [surfacePresenter removeObserver:self];
  }
  std::vector<std::function<void()>> rejections;
  rejections.reserve(_pendingStarts.size());
  for (auto &[_, pending] : _pendingStarts) {
    rejections.push_back(std::move(pending.reject));
  }
  _pendingStarts.clear();
  for (auto &reject : rejections) {
    reject();
  }
}

- (void)enqueueHandle:(NativeAnimationHandle)handle
                 plan:(const NativeAnimationPlan &)plan
         mountingMode:(NativeAnimationMountingMode)mountingMode
                start:(std::function<void()>)start
               reject:(std::function<void()>)reject
{
  RCTAssertMainQueue();
  RCTComponentViewRegistry *registry = _surfacePresenter.mountingManager.componentViewRegistry;
  REAUIView<RCTComponentViewProtocol> *view = [registry findComponentViewWithTag:handle.tag];
  const auto expected = expectedGeometry(plan);
  const bool mountedOnSurface = view != nil && belongsToSurface(view, handle.surfaceId);
  const bool ready = mountedOnSurface &&
      (mountingMode == NativeAnimationMountingMode::RetainedCurrentState ||
       modelMatchesFinalGeometry(view.layer, expected));
  if (ready) {
    start();
    return;
  }

  if (_pendingStarts.contains(handle)) {
    reject();
    return;
  }
  _pendingStarts.emplace(handle, PendingStart{mountingMode, expected, std::move(start), std::move(reject)});
}

- (void)cancelHandle:(NativeAnimationHandle)handle
{
  RCTAssertMainQueue();
  _pendingStarts.erase(handle);
}

- (void)didMountComponentsWithRootTag:(NSInteger)rootTag
{
  RCTAssertMainQueue();
  if (_pendingStarts.empty()) {
    return;
  }

  RCTComponentViewRegistry *registry = _surfacePresenter.mountingManager.componentViewRegistry;
  std::vector<std::function<void()>> starts;
  std::vector<std::function<void()>> rejections;
  for (auto iterator = _pendingStarts.begin(); iterator != _pendingStarts.end();) {
    const auto handle = iterator->first;
    if (handle.surfaceId != rootTag) {
      ++iterator;
      continue;
    }

    auto pending = std::move(iterator->second);
    iterator = _pendingStarts.erase(iterator);
    REAUIView<RCTComponentViewProtocol> *view = [registry findComponentViewWithTag:handle.tag];
    const bool mountedOnSurface = view != nil && belongsToSurface(view, handle.surfaceId);
    const bool ready = mountedOnSurface &&
        (pending.mountingMode == NativeAnimationMountingMode::RetainedCurrentState ||
         modelMatchesFinalGeometry(view.layer, pending.expectedGeometry));
    if (ready) {
      starts.push_back(std::move(pending.start));
    } else {
      rejections.push_back(std::move(pending.reject));
    }
  }

  for (auto &start : starts) {
    start();
  }
  for (auto &reject : rejections) {
    reject();
  }
}

@end
