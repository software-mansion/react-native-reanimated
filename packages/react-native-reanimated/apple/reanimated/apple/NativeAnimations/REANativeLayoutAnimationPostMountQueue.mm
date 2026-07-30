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
#import <vector>

using namespace facebook::react;
using namespace reanimated;

namespace {

constexpr CGFloat kGeometryTolerance = 0.5;

struct ExpectedGeometry {
  std::optional<CGFloat> originX;
  std::optional<CGFloat> originY;
  std::optional<CGFloat> width;
  std::optional<CGFloat> height;
};

struct PendingStart {
  NativeAnimationMountingMode mountingMode;
  ExpectedGeometry expectedGeometry;
  std::function<void()> start;
  std::function<void()> reject;
};

std::optional<CGFloat> finalValue(const NativeLayoutAnimationDescriptor &descriptor, const std::string &keyPath)
{
  for (const auto &property : descriptor.properties) {
    if (property.keyPath == keyPath && !property.values.empty()) {
      return static_cast<CGFloat>(property.values.back());
    }
  }
  return std::nullopt;
}

ExpectedGeometry expectedGeometry(const NativeLayoutAnimationDescriptor &descriptor)
{
  return {
      .originX = finalValue(descriptor, "originX"),
      .originY = finalValue(descriptor, "originY"),
      .width = finalValue(descriptor, "width"),
      .height = finalValue(descriptor, "height")};
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
           descriptor:(const NativeLayoutAnimationDescriptor &)descriptor
         mountingMode:(NativeAnimationMountingMode)mountingMode
                start:(std::function<void()>)start
               reject:(std::function<void()>)reject
{
  RCTAssertMainQueue();
  RCTComponentViewRegistry *registry = _surfacePresenter.mountingManager.componentViewRegistry;
  REAUIView<RCTComponentViewProtocol> *view = [registry findComponentViewWithTag:handle.tag];
  const auto expected = expectedGeometry(descriptor);
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
