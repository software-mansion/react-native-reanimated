#import <reanimated/CSS/utils/platform.h>
#import <reanimated/Tools/FeatureFlags.h>
#import <reanimated/Tools/PlatformDepMethodsHolder.h>
#import <reanimated/apple/CSS/REACSSPlatformTransitions.h>
#import <reanimated/apple/READisplayLink.h>
#import <reanimated/apple/REANodesManager.h>
#import <reanimated/apple/REASlowAnimations.h>
#import <reanimated/apple/REAUIView.h>
#import <reanimated/apple/RNGestureHandlerStateManager.h>
#import <reanimated/apple/keyboardObserver/REAKeyboardEventObserver.h>
#import <reanimated/apple/native/SetGestureState.h>
#import <reanimated/apple/pseudoSelectors/REAPseudoSelectorAttachQueue.h>
#import <reanimated/apple/sensor/ReanimatedSensorContainer.h>

#import <React/RCTComponentViewProtocol.h>
#import <React/RCTComponentViewRegistry.h>
#import <React/RCTMountingManager.h>

#import <memory>
#import <variant>

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

namespace {

/// Drives CSS transitions through Core Animation on the view's layer.
class REACSSPlatformTransitionBackend : public css::CSSPlatformTransitionBackend {
 public:
  explicit REACSSPlatformTransitionBackend(REACSSPlatformTransitions *platformTransitions)
      : platformTransitions_(platformTransitions)
  {
  }

  bool canRoute(const std::string &propertyName, const css::EasingConfig &easing) const override
  {
    // TODO: border props snap when RN rasterizes the border (the view fails
    // useCoreAnimationBorderRendering); route them only when the layer draws them.
    // CAMediaTimingFunction carries only linear and cubic-bezier curves.
    return css::hasPlatformValueTraits(propertyName) &&
        (std::holds_alternative<css::LinearEasing>(easing) || std::holds_alternative<css::CubicBezierEasing>(easing));
  }

  bool startTransition(
      Tag viewTag,
      const std::string &propertyName,
      const css::PlatformValue &fromValue,
      const css::PlatformValue &toValue,
      double durationMs,
      double startTimestampMs,
      const css::EasingConfig &easing,
      bool persistent) override
  {
    return [platformTransitions_ startTransitionForTag:viewTag
                                          propertyName:propertyName
                                             fromValue:fromValue
                                               toValue:toValue
                                            durationMs:durationMs
                                      startTimestampMs:startTimestampMs
                                                easing:easing
                                            persistent:persistent];
  }

  void stopTransition(Tag viewTag, const std::string &propertyName, bool settle) override
  {
    [platformTransitions_ stopTransitionForTag:viewTag propertyName:propertyName settle:settle];
  }

 private:
  REACSSPlatformTransitions *platformTransitions_;
};

/// The one place that decides whether CSS transitions run on Core Animation.
std::shared_ptr<css::CSSPlatformTransitionBackend> makePlatformTransitionBackend(REANodesManager *nodesManager)
{
  if constexpr (!StaticFeatureFlags::getFlag("IOS_CSS_CORE_ANIMATION")) {
    return nullptr;
  }
  REACSSPlatformTransitions *platformTransitions =
      [[REACSSPlatformTransitions alloc] initWithSurfacePresenter:nodesManager.surfacePresenter];
  return std::make_shared<REACSSPlatformTransitionBackend>(platformTransitions);
}

} // namespace

ForceScreenSnapshotFunction makeForceScreenSnapshotFunction(REANodesManager *nodesManager)
{
  auto forceScreenSnapshot = [=](Tag tag) {
    RCTSurfacePresenter *surfacePresenter = nodesManager.surfacePresenter;
    RCTComponentViewRegistry *componentViewRegistry = surfacePresenter.mountingManager.componentViewRegistry;
    REAUIView<RCTComponentViewProtocol> *maybeRNSScreenView = [componentViewRegistry findComponentViewWithTag:tag];
    SEL setSnapshotAfterUpdatesSelector = @selector(setSnapshotAfterUpdates:);
    if ([maybeRNSScreenView respondsToSelector:setSnapshotAfterUpdatesSelector]) {
      [static_cast<id<RNScreenViewOptionalProtocol>>(maybeRNSScreenView) setSnapshotAfterUpdates:YES];
    }
  };
  return forceScreenSnapshot;
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

  auto synchronouslyUpdateUIPropsFunction = makeSynchronouslyUpdateUIPropsFunction(nodesManager);

  auto getAnimationTimestamp = makeGetAnimationTimestamp();

  ReanimatedSensorContainer *reanimatedSensorContainer = [[ReanimatedSensorContainer alloc] init];

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

  auto platformTransitionBackend = makePlatformTransitionBackend(nodesManager);

  PlatformDepMethodsHolder platformDepMethodsHolder = {
      requestRender,
      forceScreenSnapshotFunction,
      synchronouslyUpdateUIPropsFunction,
      getAnimationTimestamp,
      registerSensorFunction,
      unregisterSensorFunction,
      setGestureStateFunction,
      subscribeForKeyboardEventsFunction,
      unsubscribeFromKeyboardEventsFunction,
      maybeFlushUIUpdatesQueueFunction,
      attachPseudoSelectorFunction,
      detachPseudoSelectorFunction,
      platformTransitionBackend,
  };
  return platformDepMethodsHolder;
}

} // namespace reanimated
