#import <reanimated/Tools/FeatureFlags.h>
#import <reanimated/Tools/PlatformDepMethodsHolder.h>
#import <reanimated/apple/CSS/REACSSPlatformTransitionBackend.h>
#import <reanimated/apple/NativeAnimations/REANativeAnimationPlatform.h>
#import <reanimated/apple/READisplayLink.h>
#import <reanimated/apple/REANodesManager.h>
#import <reanimated/apple/REASlowAnimations.h>
#import <reanimated/apple/REAUIView.h>
#import <reanimated/apple/RNGestureHandlerStateManager.h>
#import <reanimated/apple/keyboardObserver/REAKeyboardEventObserver.h>
#import <reanimated/apple/native/SetGestureState.h>
#import <reanimated/apple/pseudoSelectors/REAPseudoSelectorAttachQueue.h>
#import <reanimated/apple/sensor/ReanimatedSensorContainer.h>

#import <React/RCTAssert.h>
#import <React/RCTComponentViewProtocol.h>
#import <React/RCTComponentViewRegistry.h>
#import <React/RCTMountingManager.h>
#import <React/RCTViewComponentView.h>

#import <algorithm>
#import <cmath>
#import <memory>

@protocol RNScreenViewOptionalProtocol <NSObject>
@required
- (void)setSnapshotAfterUpdates:(BOOL)snapshot;
@end

namespace reanimated {

using namespace facebook;
using namespace react;

SetGestureStateFunction makeSetGestureStateFunction(RCTModuleRegistry *moduleRegistry)
{
  id<RNGestureHandlerStateManager> gestureHandlerStateManager = nil;
  auto setGestureStateFunction = [gestureHandlerStateManager, moduleRegistry](int handlerTag, int newState) mutable {
    if (gestureHandlerStateManager == nil) {
      gestureHandlerStateManager = [moduleRegistry moduleForName:"RNGestureHandlerModule"];
    }
    setGestureState(gestureHandlerStateManager, handlerTag, newState);
  };
  return setGestureStateFunction;
}

RequestRenderFunction makeRequestRender(REANodesManager *nodesManager)
{
  // NOLINTNEXTLINE(performance-unnecessary-value-param)
  auto requestRender = [nodesManager](std::function<void(double)> onRender) {
    [nodesManager postOnAnimation:^(READisplayLink *displayLink) {
#if !TARGET_OS_OSX
      auto targetTimestamp = displayLink.targetTimestamp;
#else
      // TODO macOS targetTimestamp isn't available on macOS
      auto targetTimestamp = displayLink.timestamp + displayLink.duration;
#endif
      const double frameTimestamp = calculateTimestampWithSlowAnimations(targetTimestamp) * 1000;
      onRender(frameTimestamp);
    }];
  };

  return requestRender;
}

SynchronouslyUpdateUIPropsFunction makeSynchronouslyUpdateUIPropsFunction(REANodesManager *nodesManager)
{
  auto synchronouslyUpdateUIPropsFunction = [nodesManager](const int viewTag, const folly::dynamic &props) {
    [nodesManager synchronouslyUpdateUIProps:viewTag props:props];
  };
  return synchronouslyUpdateUIPropsFunction;
}

GetAnimationTimestampFunction makeGetAnimationTimestamp()
{
  auto getAnimationTimestamp = []() {
    return calculateTimestampWithSlowAnimations(CACurrentMediaTime()) * 1000;
  };
  return getAnimationTimestamp;
}

MaybeFlushUIUpdatesQueueFunction makeMaybeFlushUIUpdatesQueueFunction(REANodesManager *nodesManager)
{
  auto maybeFlushUIUpdatesQueueFunction = [nodesManager]() {
    [nodesManager maybeFlushUIUpdatesQueue];
  };
  return maybeFlushUIUpdatesQueueFunction;
}

IsSensorAvailableFunction makeIsSensorAvailableFunction(ReanimatedSensorContainer *reanimatedSensorContainer)
{
  auto isSensorAvailableFunction = [=](int sensorType) -> bool {
    return [reanimatedSensorContainer isSensorAvailable:(ReanimatedSensorType)sensorType];
  };
  return isSensorAvailableFunction;
}

RegisterSensorFunction makeRegisterSensorFunction(ReanimatedSensorContainer *reanimatedSensorContainer)
{
  auto registerSensorFunction = [=](int sensorType,
                                    int interval,
                                    int iosReferenceFrame,
                                    // NOLINTNEXTLINE(performance-unnecessary-value-param)
                                    std::function<void(double[], int)> setter) -> int {
    return [reanimatedSensorContainer
           registerSensor:(ReanimatedSensorType)sensorType
                 interval:interval
        iosReferenceFrame:iosReferenceFrame
                   setter:^(double *data, int orientationDegrees) { setter(data, orientationDegrees); }];
  };
  return registerSensorFunction;
}

UnregisterSensorFunction makeUnregisterSensorFunction(ReanimatedSensorContainer *reanimatedSensorContainer)
{
  auto unregisterSensorFunction = [=](int sensorId) {
    [reanimatedSensorContainer unregisterSensor:sensorId];
  };
  return unregisterSensorFunction;
}

KeyboardEventSubscribeFunction makeSubscribeForKeyboardEventsFunction(REAKeyboardEventObserver *keyboardObserver)
{
  auto subscribeForKeyboardEventsFunction =
      // NOLINTNEXTLINE(performance-unnecessary-value-param)
      [=](std::function<void(int keyboardState, int height)> keyboardEventDataUpdater,
          bool isStatusBarTranslucent,
          bool isNavigationBarTranslucent) {
        // ignore isStatusBarTranslucent and isNavigationBarTranslucent - those are Android only
        return [keyboardObserver subscribeForKeyboardEvents:^(int keyboardState, int height) {
          keyboardEventDataUpdater(keyboardState, height);
        }];
      };
  return subscribeForKeyboardEventsFunction;
}

KeyboardEventUnsubscribeFunction makeUnsubscribeFromKeyboardEventsFunction(REAKeyboardEventObserver *keyboardObserver)
{
  auto unsubscribeFromKeyboardEventsFunction = [=](int listenerId) {
    [keyboardObserver unsubscribeFromKeyboardEvents:listenerId];
  };
  return unsubscribeFromKeyboardEventsFunction;
}

ForceScreenSnapshotFunction makeForceScreenSnapshotFunction(REANodesManager *nodesManager)
{
  auto forceScreenSnapshot = [=](Tag tag) -> bool {
    RCTSurfacePresenter *surfacePresenter = nodesManager.surfacePresenter;
    RCTComponentViewRegistry *componentViewRegistry = surfacePresenter.mountingManager.componentViewRegistry;
    REAUIView<RCTComponentViewProtocol> *maybeRNSScreenView = [componentViewRegistry findComponentViewWithTag:tag];
    SEL setSnapshotAfterUpdatesSelector = @selector(setSnapshotAfterUpdates:);
    if ([maybeRNSScreenView respondsToSelector:setSnapshotAfterUpdatesSelector]) {
      [static_cast<id<RNScreenViewOptionalProtocol>>(maybeRNSScreenView) setSnapshotAfterUpdates:YES];
      return true;
    }
    return false;
  };
  return forceScreenSnapshot;
}

ReadMountedViewPropsFunction makeReadMountedViewPropsFunction(REANodesManager *nodesManager)
{
  auto readMountedViewProps = [=](Tag tag) -> Props::Shared {
    RCTAssertMainQueue();
    RCTSurfacePresenter *surfacePresenter = nodesManager.surfacePresenter;
    RCTComponentViewRegistry *componentViewRegistry = surfacePresenter.mountingManager.componentViewRegistry;
    REAUIView<RCTComponentViewProtocol> *componentView = [componentViewRegistry findComponentViewWithTag:tag];
    // The default `props` getter of `UIView` asserts.
    if (![componentView isKindOfClass:[RCTViewComponentView class]]) {
      return nullptr;
    }
    return [componentView props];
  };
  return readMountedViewProps;
}

#if !TARGET_OS_OSX
static int argbFromCGColor(CGColorRef color)
{
  CGFloat red = 0;
  CGFloat green = 0;
  CGFloat blue = 0;
  CGFloat alpha = 0;
  if (color != nil) {
    [[UIColor colorWithCGColor:color] getRed:&red green:&green blue:&blue alpha:&alpha];
  }
  const auto channel = [](CGFloat value) {
    return static_cast<uint32_t>(std::lround(std::clamp(value, 0.0, 1.0) * 255));
  };
  return static_cast<int>(channel(alpha) << 24 | channel(red) << 16 | channel(green) << 8 | channel(blue));
}
#endif

ObtainMountedViewPropsFunction makeObtainMountedViewPropsFunction(REANodesManager *nodesManager)
{
  return [=](Tag tag, bool presented) -> std::optional<MountedViewProps> {
#if TARGET_OS_OSX
    return std::nullopt;
#else
    RCTComponentViewRegistry *componentViewRegistry =
        nodesManager.surfacePresenter.mountingManager.componentViewRegistry;
    REAUIView *view = [componentViewRegistry findComponentViewWithTag:tag];
    if (view == nil || view.window == nil) {
      return std::nullopt;
    }
    // A layer has no presentation layer until Core Animation renders it.
    CALayer *layer = presented ? (view.layer.presentationLayer ?: view.layer) : view.layer;
    const CGSize size = layer.bounds.size;
    const CGPoint anchor = layer.anchorPoint;
    return MountedViewProps{
        .x = layer.position.x - size.width * anchor.x,
        .y = layer.position.y - size.height * anchor.y,
        .width = size.width,
        .height = size.height,
        .opacity = layer.opacity,
        // React Native paints the background on an unanimated sublayer for non-circular corners and for
        // visible borders without clipping, and keeps its color in `backgroundColor`.
        .backgroundColor = argbFromCGColor(
            layer.backgroundColor
                ?: [view.backgroundColor resolvedColorWithTraitCollection:view.traitCollection].CGColor),
    };
#endif
  };
}

PlatformAttachPseudoSelectorFunction makeAttachPseudoSelectorFunction(REAPseudoSelectorAttachQueue *attachQueue)
{
  return [attachQueue](Tag tag, PseudoSelector selector, std::function<void(bool)> callback) {
    auto sharedCallback = std::make_shared<std::function<void(bool)>>(std::move(callback));
    dispatch_async(
        dispatch_get_main_queue(), ^{ [attachQueue attachTag:tag selector:selector sharedCallback:sharedCallback]; });
  };
}

PlatformDetachPseudoSelectorFunction makeDetachPseudoSelectorFunction(REAPseudoSelectorAttachQueue *attachQueue)
{
  return [attachQueue](Tag tag, PseudoSelector selector) {
    dispatch_async(dispatch_get_main_queue(), ^{ [attachQueue detachTag:tag selector:selector]; });
  };
}

PlatformDepMethodsHolder makePlatformDepMethodsHolder(RCTModuleRegistry *moduleRegistry, REANodesManager *nodesManager)
{
  auto requestRender = makeRequestRender(nodesManager);

  auto forceScreenSnapshotFunction = makeForceScreenSnapshotFunction(nodesManager);

  auto readMountedViewPropsFunction = makeReadMountedViewPropsFunction(nodesManager);

  auto synchronouslyUpdateUIPropsFunction = makeSynchronouslyUpdateUIPropsFunction(nodesManager);

  auto getAnimationTimestamp = makeGetAnimationTimestamp();

  ReanimatedSensorContainer *reanimatedSensorContainer = [[ReanimatedSensorContainer alloc] init];

  auto isSensorAvailableFunction = makeIsSensorAvailableFunction(reanimatedSensorContainer);

  auto registerSensorFunction = makeRegisterSensorFunction(reanimatedSensorContainer);

  auto unregisterSensorFunction = makeUnregisterSensorFunction(reanimatedSensorContainer);

  auto setGestureStateFunction = makeSetGestureStateFunction(moduleRegistry);

  REAKeyboardEventObserver *keyboardObserver = [[REAKeyboardEventObserver alloc] init];

  auto subscribeForKeyboardEventsFunction = makeSubscribeForKeyboardEventsFunction(keyboardObserver);

  auto unsubscribeFromKeyboardEventsFunction = makeUnsubscribeFromKeyboardEventsFunction(keyboardObserver);

  auto maybeFlushUIUpdatesQueueFunction = makeMaybeFlushUIUpdatesQueueFunction(nodesManager);

  REAPseudoSelectorAttachQueue *attachQueue =
      [[REAPseudoSelectorAttachQueue alloc] initWithSurfacePresenter:nodesManager.surfacePresenter];
  auto attachPseudoSelectorFunction = makeAttachPseudoSelectorFunction(attachQueue);
  auto detachPseudoSelectorFunction = makeDetachPseudoSelectorFunction(attachQueue);

  auto obtainMountedViewPropsFunction = makeObtainMountedViewPropsFunction(nodesManager);

  std::shared_ptr<native_animation::NativeAnimationHost> nativeAnimationHost;
  std::shared_ptr<css::CSSPlatformTransitionBackend> platformTransitionBackend;
  if constexpr (
      StaticFeatureFlags::getFlag("IOS_CSS_CORE_ANIMATION") ||
      StaticFeatureFlags::getFlag("IOS_LAYOUT_ANIMATIONS_CORE_ANIMATION")) {
    nativeAnimationHost = native_animation::NativeAnimationHost::create(
        native_animation::makeCoreAnimationPlatform(nodesManager.surfacePresenter));
  }
  if constexpr (StaticFeatureFlags::getFlag("IOS_CSS_CORE_ANIMATION")) {
    platformTransitionBackend = css::makeCSSPlatformTransitionBackend(nativeAnimationHost);
  }

  PlatformDepMethodsHolder platformDepMethodsHolder = {
      requestRender,
      forceScreenSnapshotFunction,
      readMountedViewPropsFunction,
      synchronouslyUpdateUIPropsFunction,
      getAnimationTimestamp,
      isSensorAvailableFunction,
      registerSensorFunction,
      unregisterSensorFunction,
      setGestureStateFunction,
      subscribeForKeyboardEventsFunction,
      unsubscribeFromKeyboardEventsFunction,
      maybeFlushUIUpdatesQueueFunction,
      attachPseudoSelectorFunction,
      detachPseudoSelectorFunction,
      obtainMountedViewPropsFunction,
      platformTransitionBackend,
      nativeAnimationHost,
  };
  return platformDepMethodsHolder;
}

} // namespace reanimated
