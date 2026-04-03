#import <objc/runtime.h>
#import <reanimated/Tools/PlatformDepMethodsHolder.h>
#import <reanimated/apple/READisplayLink.h>
#import <reanimated/apple/REANodesManager.h>
#import <reanimated/apple/REASlowAnimations.h>
#import <reanimated/apple/REAUIView.h>
#import <reanimated/apple/RNGestureHandlerStateManager.h>
#import <reanimated/apple/keyboardObserver/REAKeyboardEventObserver.h>
#import <reanimated/apple/native/SetGestureState.h>
#import <reanimated/apple/pseudoSelectors/REAPseudoSelectorObserver.h>
#import <reanimated/apple/sensor/ReanimatedSensorContainer.h>

#import <React/RCTComponentViewProtocol.h>
#import <React/RCTComponentViewRegistry.h>
#import <React/RCTMountingManager.h>

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
  auto registerSensorFunction =
      [=](int sensorType, int interval, int iosReferenceFrame, std::function<void(double[], int)> setter) -> int {
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
  auto forceScreenSnapshot = [=](Tag tag) {
    RCTSurfacePresenter *surfacePresenter = nodesManager.surfacePresenter;
    RCTComponentViewRegistry *componentViewRegistry = surfacePresenter.mountingManager.componentViewRegistry;
    REAUIView<RCTComponentViewProtocol> *maybeRNSScreenView = [componentViewRegistry findComponentViewWithTag:tag];
    SEL setSnapshotAfterUpdatesSelector = @selector(setSnapshotAfterUpdates:);
    if ([maybeRNSScreenView respondsToSelector:setSnapshotAfterUpdatesSelector]) {
      [(id<RNScreenViewOptionalProtocol>)maybeRNSScreenView setSnapshotAfterUpdates:YES];
    }
  };
  return forceScreenSnapshot;
}

static char kREAPseudoSelectorObserversKey;

static NSString *selectorNSFromEnum(PseudoSelector selector)
{
  switch (selector) {
    case PseudoSelector::Active:
      return @":active";
    case PseudoSelector::Focus:
      return @":focus";
    case PseudoSelector::Hover:
      return @":hover";
  }
}

static void attachObserverToView(
    REAUIView *view,
    PseudoSelector selector,
    const std::shared_ptr<std::function<void(bool)>> &sharedCallback)
{
  NSMutableDictionary<NSNumber *, REAPseudoSelectorObserver *> *observers =
      objc_getAssociatedObject(view, &kREAPseudoSelectorObserversKey);
  if (!observers) {
    observers = [NSMutableDictionary new];
    objc_setAssociatedObject(view, &kREAPseudoSelectorObserversKey, observers, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
  }
  NSNumber *key = @(static_cast<int>(selector));
  // Detach any existing observer for this selector before replacing it (clear the queue)
  [observers[key] detach];
  NSString *selectorNS = selectorNSFromEnum(selector);
  REAPseudoSelectorObserver *observer = [[REAPseudoSelectorObserver alloc] initWithView:view
                                                                               selector:selectorNS
                                                                               callback:*sharedCallback];
  observers[key] = observer;
}

PlatformAttachPseudoSelectorFunction makeAttachPseudoSelectorFunction(REANodesManager *nodesManager)
{
  return [nodesManager](Tag tag, PseudoSelector selector, std::function<void(bool)> callback) {
    auto sharedCallback = std::make_shared<std::function<void(bool)>>(std::move(callback));
    NSLog(@"[PseudoSelector] attachFn called tag=%d selector=%d", tag, static_cast<int>(selector));

    dispatch_async(dispatch_get_main_queue(), ^{
      RCTComponentViewRegistry *registry = nodesManager.surfacePresenter.mountingManager.componentViewRegistry;
      REAUIView *view = [registry findComponentViewWithTag:tag];
      NSLog(@"[PseudoSelector] findComponentViewWithTag:%d → %@", tag, view);

      if (view) {
        // View already in registry - attach immediately
        attachObserverToView(view, selector, sharedCallback);
      } else {
        // View not yet mounted. Store a pending block that will be executed by
        // REANodesManager after the next mounting transaction completes.
        [nodesManager addPendingPseudoSelectorAttach:^(REAUIView *mountedView) {
          NSLog(@"[PseudoSelector] deferred attach tag=%d selector=%d", tag, static_cast<int>(selector));
          attachObserverToView(mountedView, selector, sharedCallback);
        }
                                              forTag:tag
                                         selectorInt:static_cast<int>(selector)];
      }
    });
  };
}

PlatformDetachPseudoSelectorFunction makeDetachPseudoSelectorFunction(REANodesManager *nodesManager)
{
  return [nodesManager](Tag tag, PseudoSelector selector) {
    dispatch_async(dispatch_get_main_queue(), ^{
      // Cancel any pending attach that hasn't fired yet.
      [nodesManager removePendingPseudoSelectorAttach:tag selectorInt:static_cast<int>(selector)];

      RCTComponentViewRegistry *registry = nodesManager.surfacePresenter.mountingManager.componentViewRegistry;
      REAUIView *view = [registry findComponentViewWithTag:tag];
      if (!view) {
        return;
      }
      NSMutableDictionary<NSNumber *, REAPseudoSelectorObserver *> *observers =
          objc_getAssociatedObject(view, &kREAPseudoSelectorObserversKey);
      NSNumber *key = @(static_cast<int>(selector));
      [observers[key] detach];
      [observers removeObjectForKey:key];
    });
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

  auto attachPseudoSelectorFunction = makeAttachPseudoSelectorFunction(nodesManager);
  auto detachPseudoSelectorFunction = makeDetachPseudoSelectorFunction(nodesManager);

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
  };
  return platformDepMethodsHolder;
}

} // namespace reanimated
