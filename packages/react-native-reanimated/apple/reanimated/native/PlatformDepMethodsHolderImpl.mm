#import <RNReanimated/LayoutAnimationsManager.h>
#import <RNReanimated/NativeMethods.h>
#import <RNReanimated/NativeProxy.h>
#import <RNReanimated/PlatformDepMethodsHolder.h>
#import <RNReanimated/REAAnimationsManager.h>
#import <RNReanimated/REAIOSUIScheduler.h>
#import <RNReanimated/REAJSIUtils.h>
#import <RNReanimated/REAKeyboardEventObserver.h>
#import <RNReanimated/REAMessageThread.h>
#import <RNReanimated/REAModule.h>
#import <RNReanimated/REANodesManager.h>
#import <RNReanimated/REASlowAnimations.h>
#import <RNReanimated/REASwizzledUIManager.h>
#import <RNReanimated/RNGestureHandlerStateManager.h>
#import <RNReanimated/ReanimatedRuntime.h>
#import <RNReanimated/ReanimatedSensorContainer.h>

#ifndef NDEBUG
#import <RNReanimated/REAScreensHelper.h>
#endif

#ifdef RCT_NEW_ARCH_ENABLED
#import <React/RCTBridge+Private.h>
#import <React/RCTScheduler.h>
#import <React/RCTSurfacePresenter.h>
#import <react/renderer/core/ShadowNode.h>
#import <react/renderer/uimanager/primitives.h>
#endif

#import <React/RCTUIManager.h>

#if TARGET_IPHONE_SIMULATOR
#import <dlfcn.h>
#endif

#import <RNReanimated/READisplayLink.h>

@interface RCTUIManager (DispatchCommand)
- (void)dispatchViewManagerCommand:(nonnull NSNumber *)reactTag
                         commandID:(id /*(NSString or NSNumber) */)commandID
                       commandArgs:(NSArray<id> *)commandArgs;
@end

namespace reanimated {

using namespace facebook;
using namespace react;

static NSSet *convertProps(jsi::Runtime &rt, const jsi::Value &props)
{
  NSMutableSet *propsSet = [[NSMutableSet alloc] init];
  jsi::Array propsNames = props.asObject(rt).asArray(rt);
  for (int i = 0; i < propsNames.size(rt); i++) {
    NSString *propName = @(propsNames.getValueAtIndex(rt, i).asString(rt).utf8(rt).c_str());
    [propsSet addObject:propName];
  }
  return propsSet;
}

SetGestureStateFunction makeSetGestureStateFunction(RCTBridge *bridge)
{
  id<RNGestureHandlerStateManager> gestureHandlerStateManager = nil;
  auto setGestureStateFunction = [gestureHandlerStateManager, bridge](int handlerTag, int newState) mutable {
    if (gestureHandlerStateManager == nil) {
      gestureHandlerStateManager = [bridge moduleForName:@"RNGestureHandlerModule"];
    }

    setGestureState(gestureHandlerStateManager, handlerTag, newState);
  };
  return setGestureStateFunction;
}

#if REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)
SetGestureStateFunction makeSetGestureStateFunctionBridgeless(RCTModuleRegistry *moduleRegistry)
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
#endif // REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)

RequestRenderFunction makeRequestRender(REANodesManager *nodesManager)
{
  auto requestRender = [nodesManager](std::function<void(double)> onRender, jsi::Runtime &rt) {
    [nodesManager postOnAnimation:^(READisplayLink *displayLink) {
#if !TARGET_OS_OSX
      auto targetTimestamp = displayLink.targetTimestamp;
#else
      // TODO macOS targetTimestamp isn't available on macOS
      auto targetTimestamp = displayLink.timestamp + displayLink.duration;
#endif
      double frameTimestamp =

          (targetTimestamp)*1000;
      onRender(frameTimestamp);
    }];
  };

  return requestRender;
}

#ifdef RCT_NEW_ARCH_ENABLED
SynchronouslyUpdateUIPropsFunction makeSynchronouslyUpdateUIPropsFunction(REANodesManager *nodesManager)
{
  auto synchronouslyUpdateUIPropsFunction = [nodesManager](jsi::Runtime &rt, Tag tag, const jsi::Object &props) {
    NSNumber *viewTag = @(tag);
    NSDictionary *uiProps = convertJSIObjectToNSDictionary(rt, props);
    [nodesManager synchronouslyUpdateViewOnUIThread:viewTag props:uiProps];
  };
  return synchronouslyUpdateUIPropsFunction;
}
#endif // RCT_NEW_ARCH_ENABLED

#ifdef RCT_NEW_ARCH_ENABLED
// nothing
#else // RCT_NEW_ARCH_ENABLED
UpdatePropsFunction makeUpdatePropsFunction(REAModule *reaModule)
{
  auto updatePropsFunction = [reaModule](jsi::Runtime &rt, const jsi::Value &operations) -> void {
    auto array = operations.asObject(rt).asArray(rt);
    size_t length = array.size(rt);
    for (size_t i = 0; i < length; ++i) {
      auto item = array.getValueAtIndex(rt, i).asObject(rt);
      int viewTag = item.getProperty(rt, "tag").asNumber();
      const jsi::Value &viewName = item.getProperty(rt, "name");
      const jsi::Object &props = item.getProperty(rt, "updates").asObject(rt);

      NSString *nsViewName = [NSString stringWithCString:viewName.asString(rt).utf8(rt).c_str()
                                                encoding:[NSString defaultCStringEncoding]];

      NSDictionary *propsDict = convertJSIObjectToNSDictionary(rt, props);
      [reaModule.nodesManager updateProps:propsDict ofViewWithTag:[NSNumber numberWithInt:viewTag] withName:nsViewName];
    }
  };
  return updatePropsFunction;
}

MeasureFunction makeMeasureFunction(RCTUIManager *uiManager)
{
  auto measureFunction = [uiManager](int viewTag) -> std::vector<std::pair<std::string, double>> {
    return measure(viewTag, uiManager);
  };
  return measureFunction;
}

ScrollToFunction makeScrollToFunction(RCTUIManager *uiManager)
{
  auto scrollToFunction = [uiManager](int viewTag, double x, double y, bool animated) {
    scrollTo(viewTag, uiManager, x, y, animated);
  };
  return scrollToFunction;
}

DispatchCommandFunction makeDispatchCommandFunction(RCTUIManager *uiManager)
{
  auto dispatchCommandFunction =
      [uiManager](
          jsi::Runtime &rt, const int tag, const jsi::Value &commandNameValue, const jsi::Value &argsValue) -> void {
    NSNumber *viewTag = [NSNumber numberWithInt:tag];
    NSString *commandID = [NSString stringWithCString:commandNameValue.asString(rt).utf8(rt).c_str()
                                             encoding:[NSString defaultCStringEncoding]];
    NSArray *commandArgs = convertJSIArrayToNSArray(rt, argsValue.asObject(rt).asArray(rt));
    RCTExecuteOnUIManagerQueue(^{
      [uiManager dispatchViewManagerCommand:viewTag commandID:commandID commandArgs:commandArgs];
    });
  };
  return dispatchCommandFunction;
}

ConfigurePropsFunction makeConfigurePropsFunction(REAModule *reaModule)
{
  auto configurePropsFunction = [reaModule](
                                    jsi::Runtime &rt, const jsi::Value &uiProps, const jsi::Value &nativeProps) {
    NSSet *uiPropsSet = convertProps(rt, uiProps);
    NSSet *nativePropsSet = convertProps(rt, nativeProps);
    [reaModule.nodesManager configureUiProps:uiPropsSet andNativeProps:nativePropsSet];
  };
  return configurePropsFunction;
}

ObtainPropFunction makeObtainPropFunction(REAModule *reaModule)
{
  auto obtainPropFunction = [reaModule](jsi::Runtime &rt, const int viewTag, const jsi::Value &propName) -> jsi::Value {
    NSString *propNameConverted = [NSString stringWithFormat:@"%s", propName.asString(rt).utf8(rt).c_str()];
    std::string resultStr = std::string([[reaModule.nodesManager obtainProp:[NSNumber numberWithInt:viewTag]
                                                                   propName:propNameConverted] UTF8String]);
    jsi::Value val = jsi::String::createFromUtf8(rt, resultStr);
    return val;
  };
  return obtainPropFunction;
}

#endif // RCT_NEW_ARCH_ENABLED

GetAnimationTimestampFunction makeGetAnimationTimestamp()
{
  auto getAnimationTimestamp = []() { return calculateTimestampWithSlowAnimations(CACurrentMediaTime()) * 1000; };
  return getAnimationTimestamp;
}

ProgressLayoutAnimationFunction makeProgressLayoutAnimation(REAModule *reaModule)
{
#ifdef RCT_NEW_ARCH_ENABLED
  auto progressLayoutAnimation = [=](jsi::Runtime &rt, int tag, const jsi::Object &newStyle, bool isSharedTransition) {
    // noop
  };
#else // RCT_NEW_ARCH_ENABLED
  REAAnimationsManager *animationsManager = reaModule.animationsManager;
  __weak REAAnimationsManager *weakAnimationsManager = animationsManager;

  auto progressLayoutAnimation = [=](jsi::Runtime &rt, int tag, const jsi::Object &newStyle, bool isSharedTransition) {
    NSDictionary *propsDict = convertJSIObjectToNSDictionary(rt, newStyle);
    [weakAnimationsManager progressLayoutAnimationWithStyle:propsDict
                                                     forTag:@(tag)
                                         isSharedTransition:isSharedTransition];
  };
#endif // RCT_NEW_ARCH_ENABLED
  return progressLayoutAnimation;
}

EndLayoutAnimationFunction makeEndLayoutAnimation(REAModule *reaModule)
{
#ifdef RCT_NEW_ARCH_ENABLED
  auto endLayoutAnimation = [=](int tag, bool removeView) {
    // noop
  };
#else // RCT_NEW_ARCH_ENABLED
  REAAnimationsManager *animationsManager = reaModule.animationsManager;
  __weak REAAnimationsManager *weakAnimationsManager = animationsManager;

  auto endLayoutAnimation = [=](int tag, bool removeView) {
    [weakAnimationsManager endLayoutAnimationForTag:@(tag) removeView:removeView];
  };
#endif // RCT_NEW_ARCH_ENABLED
  return endLayoutAnimation;
}

MaybeFlushUIUpdatesQueueFunction makeMaybeFlushUIUpdatesQueueFunction(REANodesManager *nodesManager)
{
  auto maybeFlushUIUpdatesQueueFunction = [nodesManager]() { [nodesManager maybeFlushUIUpdatesQueue]; };
  return maybeFlushUIUpdatesQueueFunction;
}

RegisterSensorFunction makeRegisterSensorFunction(ReanimatedSensorContainer *reanimatedSensorContainer)
{
  auto registerSensorFunction =
      [=](int sensorType, int interval, int iosReferenceFrame, std::function<void(double[], int)> setter) -> int {
    return [reanimatedSensorContainer registerSensor:(ReanimatedSensorType)sensorType
                                            interval:interval
                                   iosReferenceFrame:iosReferenceFrame
                                              setter:^(double *data, int orientationDegrees) {
                                                setter(data, orientationDegrees);
                                              }];
  };
  return registerSensorFunction;
}

UnregisterSensorFunction makeUnregisterSensorFunction(ReanimatedSensorContainer *reanimatedSensorContainer)
{
  auto unregisterSensorFunction = [=](int sensorId) { [reanimatedSensorContainer unregisterSensor:sensorId]; };
  return unregisterSensorFunction;
}

KeyboardEventSubscribeFunction makeSubscribeForKeyboardEventsFunction(REAKeyboardEventObserver *keyboardObserver)
{
  auto subscribeForKeyboardEventsFunction =
      [=](std::function<void(int keyboardState, int height)> keyboardEventDataUpdater, bool isStatusBarTranslucent) {
        // ignore isStatusBarTranslucent - it's Android only
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

PlatformDepMethodsHolder
makePlatformDepMethodsHolder(RCTBridge *bridge, REANodesManager *nodesManager, REAModule *reaModule)
{
  auto requestRender = makeRequestRender(nodesManager);

#ifdef RCT_NEW_ARCH_ENABLED
  auto synchronouslyUpdateUIPropsFunction = makeSynchronouslyUpdateUIPropsFunction(nodesManager);
#endif // RCT_NEW_ARCH_ENABLED

#ifdef RCT_NEW_ARCH_ENABLED
  // nothing
#else
  RCTUIManager *uiManager = nodesManager.uiManager;
  auto updatePropsFunction = makeUpdatePropsFunction(reaModule);

  auto measureFunction = makeMeasureFunction(uiManager);

  auto scrollToFunction = makeScrollToFunction(uiManager);

  auto dispatchCommandFunction = makeDispatchCommandFunction(uiManager);

#endif // RCT_NEW_ARCH_ENABLED

  auto getAnimationTimestamp = makeGetAnimationTimestamp();

  auto setGestureStateFunction = makeSetGestureStateFunction(bridge);

#ifdef RCT_NEW_ARCH_ENABLED

  auto progressLayoutAnimation = makeProgressLayoutAnimation(reaModule);

  auto endLayoutAnimation = makeEndLayoutAnimation(reaModule);

#else
  // Layout Animations start

  auto progressLayoutAnimation = makeProgressLayoutAnimation(reaModule);

  auto endLayoutAnimation = makeEndLayoutAnimation(reaModule);

  auto configurePropsFunction = makeConfigurePropsFunction(reaModule);

  // Layout Animations end
#endif

  auto maybeFlushUIUpdatesQueueFunction = makeMaybeFlushUIUpdatesQueueFunction(nodesManager);

  ReanimatedSensorContainer *reanimatedSensorContainer = [[ReanimatedSensorContainer alloc] init];

  auto registerSensorFunction = makeRegisterSensorFunction(reanimatedSensorContainer);

  auto unregisterSensorFunction = makeUnregisterSensorFunction(reanimatedSensorContainer);

  REAKeyboardEventObserver *keyboardObserver = [[REAKeyboardEventObserver alloc] init];

  auto subscribeForKeyboardEventsFunction = makeSubscribeForKeyboardEventsFunction(keyboardObserver);

  auto unsubscribeFromKeyboardEventsFunction = makeUnsubscribeFromKeyboardEventsFunction(keyboardObserver);
  // end keyboard events

#ifdef RCT_NEW_ARCH_ENABLED
  // nothing
#else
  auto obtainPropFunction = makeObtainPropFunction(reaModule);
#endif

  PlatformDepMethodsHolder platformDepMethodsHolder = {
      requestRender,
#ifdef RCT_NEW_ARCH_ENABLED
      synchronouslyUpdateUIPropsFunction,
#else
      updatePropsFunction,
      scrollToFunction,
      dispatchCommandFunction,
      measureFunction,
      configurePropsFunction,
      obtainPropFunction,
#endif
      getAnimationTimestamp,
      progressLayoutAnimation,
      endLayoutAnimation,
      registerSensorFunction,
      unregisterSensorFunction,
      setGestureStateFunction,
      subscribeForKeyboardEventsFunction,
      unsubscribeFromKeyboardEventsFunction,
      maybeFlushUIUpdatesQueueFunction,
  };
  return platformDepMethodsHolder;
}

#if REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)
PlatformDepMethodsHolder makePlatformDepMethodsHolderBridgeless(
    RCTModuleRegistry *moduleRegistry,
    REANodesManager *nodesManager,
    REAModule *reaModule)
{
  auto requestRender = makeRequestRender(nodesManager);

  auto synchronouslyUpdateUIPropsFunction = makeSynchronouslyUpdateUIPropsFunction(nodesManager);

  auto getAnimationTimestamp = makeGetAnimationTimestamp();

  auto progressLayoutAnimation = makeProgressLayoutAnimation(reaModule);

  auto endLayoutAnimation = makeEndLayoutAnimation(reaModule);

  ReanimatedSensorContainer *reanimatedSensorContainer = [[ReanimatedSensorContainer alloc] init];

  auto registerSensorFunction = makeRegisterSensorFunction(reanimatedSensorContainer);

  auto unregisterSensorFunction = makeUnregisterSensorFunction(reanimatedSensorContainer);

  auto setGestureStateFunction = makeSetGestureStateFunctionBridgeless(moduleRegistry);

  REAKeyboardEventObserver *keyboardObserver = [[REAKeyboardEventObserver alloc] init];

  auto subscribeForKeyboardEventsFunction = makeSubscribeForKeyboardEventsFunction(keyboardObserver);

  auto unsubscribeFromKeyboardEventsFunction = makeUnsubscribeFromKeyboardEventsFunction(keyboardObserver);

  auto maybeFlushUIUpdatesQueueFunction = makeMaybeFlushUIUpdatesQueueFunction(nodesManager);

  PlatformDepMethodsHolder platformDepMethodsHolder = {
      requestRender,
      synchronouslyUpdateUIPropsFunction,
      getAnimationTimestamp,
      progressLayoutAnimation,
      endLayoutAnimation,
      registerSensorFunction,
      unregisterSensorFunction,
      setGestureStateFunction,
      subscribeForKeyboardEventsFunction,
      unsubscribeFromKeyboardEventsFunction,
      maybeFlushUIUpdatesQueueFunction,
  };
  return platformDepMethodsHolder;
}
#endif // REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)

} // namespace reanimated
