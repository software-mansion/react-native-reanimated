#include <reanimated/NativeModules/ReanimatedModuleProxy.h>
#include <reanimated/RuntimeDecorators/UIRuntimeDecorator.h>
#include <reanimated/Tools/CollectionUtils.h>
#include <reanimated/Tools/FeaturesConfig.h>
#include <reanimated/Tools/ReanimatedSystraceSection.h>
#include <unordered_map>

#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/Fabric/ReanimatedCommitShadowNode.h>
#include <reanimated/Fabric/ShadowTreeCloner.h>
#endif // RCT_NEW_ARCH_ENABLED

#include <worklets/Registries/EventHandlerRegistry.h>
#include <worklets/SharedItems/Shareables.h>
#include <worklets/Tools/AsyncQueue.h>
#include <worklets/Tools/JSISerializer.h>
#include <worklets/Tools/WorkletEventHandler.h>

#ifdef __ANDROID__
#include <fbjni/fbjni.h>
#endif // __ANDROID__

#ifdef RCT_NEW_ARCH_ENABLED
#include <react/renderer/scheduler/Scheduler.h>
#include <react/renderer/uimanager/UIManagerBinding.h>
#include <react/renderer/uimanager/primitives.h>
#endif // RCT_NEW_ARCH_ENABLED

#include <functional>
#include <utility>

#ifdef RCT_NEW_ARCH_ENABLED
#include <iomanip>
#include <sstream>
#include <string>
#endif // RCT_NEW_ARCH_ENABLED

// Standard `__cplusplus` macro reference:
// https://en.cppreference.com/w/cpp/preprocessor/replace#Predefined_macros
#if REACT_NATIVE_MINOR_VERSION >= 75 || __cplusplus >= 202002L
// Implicit copy capture of `this` is deprecated in NDK27, which uses C++20.
#define COPY_CAPTURE_WITH_THIS [ =, this ] // NOLINT (whitespace/braces)
#else
// React Native 0.75 is the last one which allows NDK23. NDK23 uses C++17 and
// explicitly disallows C++20 features, including the syntax above. Therefore we
// fallback to the deprecated syntax here.
#define COPY_CAPTURE_WITH_THIS [=] // NOLINT (whitespace/braces)
#endif // REACT_NATIVE_MINOR_VERSION >= 75 || __cplusplus >= 202002L

using namespace facebook;

namespace reanimated {

ReanimatedModuleProxy::ReanimatedModuleProxy(
    const std::shared_ptr<WorkletsModuleProxy> &workletsModuleProxy,
    jsi::Runtime &rnRuntime,
    const std::shared_ptr<CallInvoker> &jsCallInvoker,
    const PlatformDepMethodsHolder &platformDepMethodsHolder,
    const bool isBridgeless,
    const bool isReducedMotion)
    : ReanimatedModuleProxySpec(jsCallInvoker),
      isBridgeless_(isBridgeless),
      isReducedMotion_(isReducedMotion),
      workletsModuleProxy_(workletsModuleProxy),
      valueUnpackerCode_(workletsModuleProxy->getValueUnpackerCode()),
      eventHandlerRegistry_(std::make_unique<EventHandlerRegistry>()),
      requestRender_(platformDepMethodsHolder.requestRender),
      onRenderCallback_([this](const double timestampMs) {
        renderRequested_ = false;
        onRender(timestampMs);
      }),
      animatedSensorModule_(platformDepMethodsHolder),
      jsLogger_(
          std::make_shared<JSLogger>(workletsModuleProxy->getJSScheduler())),
      layoutAnimationsManager_(
          std::make_shared<LayoutAnimationsManager>(jsLogger_)),
      updatesRegistryManager_(std::make_shared<UpdatesRegistryManager>()),
      animatedPropsRegistry_(std::make_shared<AnimatedPropsRegistry>()),
      cssAnimationsRegistry_(std::make_shared<CSSAnimationsRegistry>()),
      cssTransitionsRegistry_(std::make_shared<CSSTransitionsRegistry>()),
      getAnimationTimestamp_(platformDepMethodsHolder.getAnimationTimestamp),
#ifdef RCT_NEW_ARCH_ENABLED
      synchronouslyUpdateUIPropsFunction_(
          platformDepMethodsHolder.synchronouslyUpdateUIPropsFunction),
#else
      obtainPropFunction_(platformDepMethodsHolder.obtainPropFunction),
      configurePropsPlatformFunction_(
          platformDepMethodsHolder.configurePropsFunction),
      updatePropsFunction_(platformDepMethodsHolder.updatePropsFunction),
#endif
      subscribeForKeyboardEventsFunction_(
          platformDepMethodsHolder.subscribeForKeyboardEvents),
      unsubscribeFromKeyboardEventsFunction_(
          platformDepMethodsHolder.unsubscribeFromKeyboardEvents) {
  commonInit(platformDepMethodsHolder);

  {
    auto lock = updatesRegistryManager_->createLock();
    // Add registries in order of their priority (from the lowest to the
    // highest)
    // CSS transitions should be overriden by animated style animations;
    // animated style animations should be overriden by CSS animations
#ifdef RCT_NEW_ARCH_ENABLED
    updatesRegistryManager_->addRegistry(cssTransitionsRegistry_);
#endif
    updatesRegistryManager_->addRegistry(animatedPropsRegistry_);
#ifdef RCT_NEW_ARCH_ENABLED
    updatesRegistryManager_->addRegistry(cssAnimationsRegistry_);
#endif
  }
}

void ReanimatedModuleProxy::commonInit(
    const PlatformDepMethodsHolder &platformDepMethodsHolder) {
  auto requestAnimationFrame =
      [this](jsi::Runtime &rt, const jsi::Value &callback) {
        this->requestAnimationFrame(rt, callback);
      };

#ifdef RCT_NEW_ARCH_ENABLED
  auto updateProps = [this](jsi::Runtime &rt, const jsi::Value &operations) {
    animatedPropsRegistry_->update(rt, operations);
  };

  auto removeFromPropsRegistry =
      [this](jsi::Runtime &rt, const jsi::Value &viewTags) {
        animatedPropsRegistry_->remove(rt, viewTags);
      };

  auto measure = [this](jsi::Runtime &rt, const jsi::Value &shadowNodeValue) {
    return this->measure(rt, shadowNodeValue);
  };

  auto dispatchCommand = [this](
                             jsi::Runtime &rt,
                             const jsi::Value &shadowNodeValue,
                             const jsi::Value &commandNameValue,
                             const jsi::Value &argsValue) {
    this->dispatchCommand(rt, shadowNodeValue, commandNameValue, argsValue);
  };
  ProgressLayoutAnimationFunction progressLayoutAnimation =
      [this](jsi::Runtime &rt, int tag, const jsi::Object &newStyle, bool) {
        auto surfaceId =
            layoutAnimationsProxy_->progressLayoutAnimation(tag, newStyle);
        if (!surfaceId) {
          return;
        }
        uiManager_->getShadowTreeRegistry().visit(
            *surfaceId, [](const ShadowTree &shadowTree) {
              shadowTree.notifyDelegatesOfUpdates();
            });
      };

  EndLayoutAnimationFunction endLayoutAnimation =
      [this](int tag, bool shouldRemove) {
        auto surfaceId =
            layoutAnimationsProxy_->endLayoutAnimation(tag, shouldRemove);
        if (!surfaceId) {
          return;
        }

        uiManager_->getShadowTreeRegistry().visit(
            *surfaceId, [](const ShadowTree &shadowTree) {
              shadowTree.notifyDelegatesOfUpdates();
            });
      };

  auto obtainProp = [this](
                        jsi::Runtime &rt,
                        const jsi::Value &shadowNodeWrapper,
                        const jsi::Value &propName) {
    return this->obtainProp(rt, shadowNodeWrapper, propName);
  };
#endif

  jsi::Runtime &uiRuntime =
      workletsModuleProxy_->getUIWorkletRuntime()->getJSIRuntime();
  UIRuntimeDecorator::decorate(
      uiRuntime,
#ifdef RCT_NEW_ARCH_ENABLED
      removeFromPropsRegistry,
      obtainProp,
      updateProps,
      measure,
      dispatchCommand,
#else
      platformDepMethodsHolder.scrollToFunction,
      platformDepMethodsHolder.obtainPropFunction,
      platformDepMethodsHolder.updatePropsFunction,
      platformDepMethodsHolder.measureFunction,
      platformDepMethodsHolder.dispatchCommandFunction,
#endif
      requestAnimationFrame,
      platformDepMethodsHolder.getAnimationTimestamp,
      platformDepMethodsHolder.setGestureStateFunction,
#ifdef RCT_NEW_ARCH_ENABLED
      progressLayoutAnimation,
      endLayoutAnimation,
#else
      platformDepMethodsHolder.progressLayoutAnimation,
      platformDepMethodsHolder.endLayoutAnimation,
#endif
      platformDepMethodsHolder.maybeFlushUIUpdatesQueueFunction);
}

ReanimatedModuleProxy::~ReanimatedModuleProxy() {
  // event handler registry and frame callbacks store some JSI values from UI
  // runtime, so they have to go away before we tear down the runtime
  eventHandlerRegistry_.reset();
  frameCallbacks_.clear();
}

jsi::Value ReanimatedModuleProxy::registerEventHandler(
    jsi::Runtime &rt,
    const jsi::Value &worklet,
    const jsi::Value &eventName,
    const jsi::Value &emitterReactTag) {
  static uint64_t NEXT_EVENT_HANDLER_ID = 1;

  uint64_t newRegistrationId = NEXT_EVENT_HANDLER_ID++;
  auto eventNameStr = eventName.asString(rt).utf8(rt);
  auto handlerShareable = extractShareableOrThrow<ShareableWorklet>(
      rt, worklet, "[Reanimated] Event handler must be a worklet.");
  int emitterReactTagInt = emitterReactTag.asNumber();

  workletsModuleProxy_->getUIScheduler()->scheduleOnUI(COPY_CAPTURE_WITH_THIS {
    auto handler = std::make_shared<WorkletEventHandler>(
        newRegistrationId, eventNameStr, emitterReactTagInt, handlerShareable);
    eventHandlerRegistry_->registerEventHandler(std::move(handler));
  });

  return jsi::Value(static_cast<double>(newRegistrationId));
}

void ReanimatedModuleProxy::unregisterEventHandler(
    jsi::Runtime &,
    const jsi::Value &registrationId) {
  uint64_t id = registrationId.asNumber();
  workletsModuleProxy_->getUIScheduler()->scheduleOnUI(
      COPY_CAPTURE_WITH_THIS

      { eventHandlerRegistry_->unregisterEventHandler(id); });
}

#ifdef RCT_NEW_ARCH_ENABLED
static inline std::string intColorToHex(const int val) {
  std::stringstream
      invertedHexColorStream; // By default transparency is first, color second
  invertedHexColorStream << std::setfill('0') << std::setw(8) << std::hex
                         << val;

  auto invertedHexColor = invertedHexColorStream.str();
  auto hexColor =
      "#" + invertedHexColor.substr(2, 6) + invertedHexColor.substr(0, 2);

  return hexColor;
}

std::string ReanimatedModuleProxy::obtainPropFromShadowNode(
    jsi::Runtime &rt,
    const std::string &propName,
    const ShadowNode::Shared &shadowNode) {
  auto newestCloneOfShadowNode =
      uiManager_->getNewestCloneOfShadowNode(*shadowNode);

  if (propName == "width" || propName == "height" || propName == "top" ||
      propName == "left") {
    // These props are calculated from frame
    auto layoutableShadowNode = dynamic_cast<LayoutableShadowNode const *>(
        newestCloneOfShadowNode.get());
    const auto &frame = layoutableShadowNode->layoutMetrics_.frame;

    if (propName == "width") {
      return std::to_string(frame.size.width);
    } else if (propName == "height") {
      return std::to_string(frame.size.height);
    } else if (propName == "top") {
      return std::to_string(frame.origin.y);
    } else if (propName == "left") {
      return std::to_string(frame.origin.x);
    }
  } else {
    // These props are calculated from viewProps
    auto props = newestCloneOfShadowNode->getProps();
    auto viewProps = std::static_pointer_cast<const ViewProps>(props);
    if (propName == "opacity") {
      return std::to_string(viewProps->opacity);
    } else if (propName == "zIndex") {
      if (viewProps->zIndex.has_value()) {
        return std::to_string(*viewProps->zIndex);
      }
    } else if (propName == "backgroundColor") {
      return intColorToHex(*viewProps->backgroundColor);
    }
  }

  throw std::runtime_error(std::string(
      "Getting property `" + propName +
      "` with function `getViewProp` is not supported"));
}

jsi::Value ReanimatedModuleProxy::getViewProp(
    jsi::Runtime &rnRuntime,
    const jsi::Value &shadowNodeWrapper,
    const jsi::Value &propName,
    const jsi::Value &callback) {
  const auto propNameStr = propName.asString(rnRuntime).utf8(rnRuntime);
  const auto funPtr = std::make_shared<jsi::Function>(
      callback.getObject(rnRuntime).asFunction(rnRuntime));
  const auto shadowNode = shadowNodeFromValue(rnRuntime, shadowNodeWrapper);
  workletsModuleProxy_->getUIScheduler()->scheduleOnUI(COPY_CAPTURE_WITH_THIS {
    jsi::Runtime &uiRuntime =
        workletsModuleProxy_->getUIWorkletRuntime()->getJSIRuntime();
    const auto resultStr =
        obtainPropFromShadowNode(uiRuntime, propNameStr, shadowNode);

    workletsModuleProxy_->getJSScheduler()->scheduleOnJS(
        [=](jsi::Runtime &rnRuntime) {
          const auto resultValue =
              jsi::String::createFromUtf8(rnRuntime, resultStr);
          funPtr->call(rnRuntime, resultValue);
        });
  });
  return jsi::Value::undefined();
}

#else

jsi::Value ReanimatedModuleProxy::getViewProp(
    jsi::Runtime &rnRuntime,
    const jsi::Value &viewTag,
    const jsi::Value &propName,
    const jsi::Value &callback) {
  const auto propNameStr = propName.asString(rnRuntime).utf8(rnRuntime);
  const auto funPtr = std::make_shared<jsi::Function>(
      callback.getObject(rnRuntime).asFunction(rnRuntime));

  const int viewTagInt = viewTag.asNumber();

  workletsModuleProxy_->getUIScheduler()->scheduleOnUI(
      COPY_CAPTURE_WITH_THIS

      () {
        jsi::Runtime &uiRuntime =
            workletsModuleProxy_->getUIWorkletRuntime()->getJSIRuntime();
        const jsi::Value propNameValue =
            jsi::String::createFromUtf8(uiRuntime, propNameStr);
        const auto resultValue =
            obtainPropFunction_(uiRuntime, viewTagInt, propNameValue);
        const auto resultStr = resultValue.asString(uiRuntime).utf8(uiRuntime);
        const auto jsScheduler = workletsModuleProxy_->getJSScheduler();
        jsScheduler->scheduleOnJS([=](jsi::Runtime &rnRuntime) {
          const auto resultValue =
              jsi::String::createFromUtf8(rnRuntime, resultStr);
          funPtr->call(rnRuntime, resultValue);
        });
      });
  return jsi::Value::undefined();
}

#endif

jsi::Value ReanimatedModuleProxy::enableLayoutAnimations(
    jsi::Runtime &,
    const jsi::Value &config) {
  FeaturesConfig::setLayoutAnimationEnabled(config.getBool());
  return jsi::Value::undefined();
}

jsi::Value ReanimatedModuleProxy::configureProps(
    jsi::Runtime &rt,
    const jsi::Value &uiProps,
    const jsi::Value &nativeProps) {
#ifdef RCT_NEW_ARCH_ENABLED
  auto uiPropsArray = uiProps.asObject(rt).asArray(rt);
  for (size_t i = 0; i < uiPropsArray.size(rt); ++i) {
    auto name = uiPropsArray.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    animatablePropNames_.insert(name);
  }
  auto nativePropsArray = nativeProps.asObject(rt).asArray(rt);
  for (size_t i = 0; i < nativePropsArray.size(rt); ++i) {
    auto name = nativePropsArray.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    nativePropNames_.insert(name);
    animatablePropNames_.insert(name);
  }
#else
  configurePropsPlatformFunction_(rt, uiProps, nativeProps);
#endif // RCT_NEW_ARCH_ENABLED

  return jsi::Value::undefined();
}

jsi::Value ReanimatedModuleProxy::configureLayoutAnimationBatch(
    jsi::Runtime &rt,
    const jsi::Value &layoutAnimationsBatch) {
  auto array = layoutAnimationsBatch.asObject(rt).asArray(rt);
  size_t length = array.size(rt);
  std::vector<LayoutAnimationConfig> batch(length);
  for (int i = 0; i < length; i++) {
    auto item = array.getValueAtIndex(rt, i).asObject(rt);
    auto &batchItem = batch[i];
    batchItem.tag = item.getProperty(rt, "viewTag").asNumber();
    batchItem.type = static_cast<LayoutAnimationType>(
        item.getProperty(rt, "type").asNumber());
    auto config = item.getProperty(rt, "config");
    if (config.isUndefined()) {
      batchItem.config = nullptr;
    } else {
      batchItem.config = extractShareableOrThrow<ShareableObject>(
          rt,
          config,
          "[Reanimated] Layout animation config must be an object.");
    }
    if (batch[i].type != SHARED_ELEMENT_TRANSITION &&
        batch[i].type != SHARED_ELEMENT_TRANSITION_PROGRESS) {
      continue;
    }
    auto sharedTransitionTag = item.getProperty(rt, "sharedTransitionTag");
    if (sharedTransitionTag.isUndefined()) {
      batch[i].config = nullptr;
    } else {
      batch[i].sharedTransitionTag = sharedTransitionTag.asString(rt).utf8(rt);
    }
  }
  layoutAnimationsManager_->configureAnimationBatch(batch);
  return jsi::Value::undefined();
}

void ReanimatedModuleProxy::setShouldAnimateExiting(
    jsi::Runtime &rt,
    const jsi::Value &viewTag,
    const jsi::Value &shouldAnimate) {
  layoutAnimationsManager_->setShouldAnimateExiting(
      viewTag.asNumber(), shouldAnimate.getBool());
}

bool ReanimatedModuleProxy::isAnyHandlerWaitingForEvent(
    const std::string &eventName,
    const int emitterReactTag) {
  return eventHandlerRegistry_->isAnyHandlerWaitingForEvent(
      eventName, emitterReactTag);
}

void ReanimatedModuleProxy::requestAnimationFrame(
    jsi::Runtime &rt,
    const jsi::Value &callback) {
  frameCallbacks_.push_back(std::make_shared<jsi::Value>(rt, callback));
  maybeRequestRender();
}

void ReanimatedModuleProxy::maybeRequestRender() {
  if (!renderRequested_) {
    renderRequested_ = true;
    jsi::Runtime &uiRuntime =
        workletsModuleProxy_->getUIWorkletRuntime()->getJSIRuntime();
    requestRender_(onRenderCallback_, uiRuntime);
  }
}

void ReanimatedModuleProxy::onRender(double timestampMs) {
  auto callbacks = std::move(frameCallbacks_);
  frameCallbacks_.clear();
  jsi::Runtime &uiRuntime =
      workletsModuleProxy_->getUIWorkletRuntime()->getJSIRuntime();
  jsi::Value timestamp{timestampMs};
  for (const auto &callback : callbacks) {
    runOnRuntimeGuarded(uiRuntime, *callback, timestamp);
  }
}

jsi::Value ReanimatedModuleProxy::registerSensor(
    jsi::Runtime &rt,
    const jsi::Value &sensorType,
    const jsi::Value &interval,
    const jsi::Value &iosReferenceFrame,
    const jsi::Value &sensorDataHandler) {
  return animatedSensorModule_.registerSensor(
      rt,
      workletsModuleProxy_->getUIWorkletRuntime(),
      sensorType,
      interval,
      iosReferenceFrame,
      sensorDataHandler);
}

void ReanimatedModuleProxy::unregisterSensor(
    jsi::Runtime &,
    const jsi::Value &sensorId) {
  animatedSensorModule_.unregisterSensor(sensorId);
}

void ReanimatedModuleProxy::cleanupSensors() {
  animatedSensorModule_.unregisterAllSensors();
}

void ReanimatedModuleProxy::registerCSSAnimation(
    jsi::Runtime &rt,
    const jsi::Value &shadowNodeWrapper,
    const jsi::Value &animationId,
    const jsi::Value &animationConfig,
    const jsi::Value &viewStyle) {
  auto shadowNode = shadowNodeFromValue(rt, shadowNodeWrapper);

  auto animation = std::make_shared<CSSAnimation>(
      rt, shadowNode, parseCSSAnimationConfig(rt, animationConfig));
  animation->updateViewStyle(rt, viewStyle);

  cssAnimationsRegistry_->add(animationId.asNumber(), animation);
  maybeRunCssAnimationsLoop();
}

void ReanimatedModuleProxy::updateCSSAnimation(
    jsi::Runtime &rt,
    const jsi::Value &animationId,
    const jsi::Value &updatedSettings,
    const jsi::Value &viewStyle) {
  cssAnimationsRegistry_->updateConfig(
      rt, animationId.asNumber(), updatedSettings, viewStyle);
}

void ReanimatedModuleProxy::unregisterCSSAnimation(
    const jsi::Value &animationId,
    const jsi::Value &revertChanges) {
  cssAnimationsRegistry_->remove(
      animationId.asNumber(), revertChanges.asBool());
}

void ReanimatedModuleProxy::registerCSSTransition(
    jsi::Runtime &rt,
    const jsi::Value &shadowNodeWrapper,
    const jsi::Value &transitionId,
    const jsi::Value &transitionConfig,
    const jsi::Value &viewStyle) {
  auto shadowNode = shadowNodeFromValue(rt, shadowNodeWrapper);

  auto transition = CSSTransition{
      rt, shadowNode, parseCSSTransitionConfig(rt, transitionConfig)};

  // TODO
}

void ReanimatedModuleProxy::updateCSSTransition(
    jsi::Runtime &rt,
    const jsi::Value &transitionId,
    const jsi::Value &transitionConfig,
    const jsi::Value &viewStyle) {
  // TODO
}

void ReanimatedModuleProxy::unregisterCSSTransition(
    const jsi::Value &transitionId) {
  // TODO
}

#ifdef RCT_NEW_ARCH_ENABLED
bool ReanimatedModuleProxy::isThereAnyLayoutProp(
    jsi::Runtime &rt,
    const jsi::Object &props) {
  const jsi::Array propNames = props.getPropertyNames(rt);
  for (size_t i = 0; i < propNames.size(rt); ++i) {
    const std::string propName =
        propNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    bool isLayoutProp =
        nativePropNames_.find(propName) != nativePropNames_.end();
    if (isLayoutProp) {
      return true;
    }
  }
  return false;
}

jsi::Value ReanimatedModuleProxy::filterNonAnimatableProps(
    jsi::Runtime &rt,
    const jsi::Value &props) {
  jsi::Object nonAnimatableProps(rt);
  bool hasAnyNonAnimatableProp = false;
  const jsi::Object &propsObject = props.asObject(rt);
  const jsi::Array &propNames = propsObject.getPropertyNames(rt);
  for (size_t i = 0; i < propNames.size(rt); ++i) {
    const std::string &propName =
        propNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    if (!collection::contains(animatablePropNames_, propName)) {
      hasAnyNonAnimatableProp = true;
      const auto &propNameStr = propName.c_str();
      const jsi::Value &propValue = propsObject.getProperty(rt, propNameStr);
      nonAnimatableProps.setProperty(rt, propNameStr, propValue);
    }
  }
  if (!hasAnyNonAnimatableProp) {
    return jsi::Value::undefined();
  }
  return nonAnimatableProps;
}
#endif // RCT_NEW_ARCH_ENABLED

bool ReanimatedModuleProxy::handleEvent(
    const std::string &eventName,
    const int emitterReactTag,
    const jsi::Value &payload,
    double currentTime) {
  eventHandlerRegistry_->processEvent(
      workletsModuleProxy_->getUIWorkletRuntime(),
      currentTime,
      eventName,
      emitterReactTag,
      payload);

  // TODO: return true if Reanimated successfully handled the event
  // to avoid sending it to JavaScript
  return false;
}

#ifdef RCT_NEW_ARCH_ENABLED
bool ReanimatedModuleProxy::handleRawEvent(
    const RawEvent &rawEvent,
    double currentTime) {
  const EventTarget *eventTarget = rawEvent.eventTarget.get();
  if (eventTarget == nullptr) {
    // after app reload scrollView is unmounted and its content offset is set
    // to 0 and view is thrown into recycle pool setting content offset
    // triggers scroll event eventTarget is null though, because it's
    // unmounting we can just ignore this event, because it's an event on
    // unmounted component
    return false;
  }

  int tag = eventTarget->getTag();
  auto eventType = rawEvent.type;
  if (eventType.rfind("top", 0) == 0) {
    eventType = "on" + eventType.substr(3);
  }
  jsi::Runtime &rt =
      workletsModuleProxy_->getUIWorkletRuntime()->getJSIRuntime();
  const auto &eventPayload = rawEvent.eventPayload;
  jsi::Value payload = eventPayload->asJSIValue(rt);

  auto res = handleEvent(eventType, tag, std::move(payload), currentTime);
  // TODO: we should call performOperations conditionally if event is handled
  // (res == true), but for now handleEvent always returns false. Thankfully,
  // performOperations does not trigger a lot of code if there is nothing to
  // be done so this is fine for now.
  performOperations();
  return res;
}

void ReanimatedModuleProxy::maybeRunCssAnimationsLoop() {
  if (cssLoopRunning_) {
    return;
  }

  cssLoopRunning_ = true;

  workletsModuleProxy_->getUIScheduler()->scheduleOnUI([this]() {
    std::shared_ptr<std::function<void(const double)>> cssLoop =
        std::make_shared<std::function<void(const double)>>();

    *cssLoop = [this, cssLoop](const double timestampMs) {
      performOperations();
      if (cssAnimationsRegistry_->hasRunningAnimations() ||
          cssTransitionsRegistry_->hasRunningTransitions()) {
        jsi::Runtime &rt =
            workletsModuleProxy_->getUIWorkletRuntime()->getJSIRuntime();
        requestRender_(*cssLoop, rt);
      } else {
        cssLoopRunning_ = false;
      }
    };

    jsi::Runtime &rt =
        workletsModuleProxy_->getUIWorkletRuntime()->getJSIRuntime();
    requestRender_(*cssLoop, rt);
  });
}

void ReanimatedModuleProxy::performOperations() {
  // Update CSS animations
  jsi::Runtime &rt =
      workletsModuleProxy_->getUIWorkletRuntime()->getJSIRuntime();
  const auto timestamp = getAnimationTimestamp_();
  cssAnimationsRegistry_->update(rt, timestamp);

  // Flush all pending updates
  UpdatesBatch updatesBatch;

  {
    auto lock = updatesRegistryManager_->createLock();
    updatesBatch = updatesRegistryManager_->flushUpdates(rt);
  }

  ReanimatedSystraceSection s("performOperations");

  for (const auto &[shadowNode, props] : updatesBatch) {
    const jsi::Value &nonAnimatableProps = filterNonAnimatableProps(rt, *props);
    if (nonAnimatableProps.isUndefined()) {
      continue;
    }
    Tag viewTag = shadowNode->getTag();
    jsi::Value maybeJSPropsUpdater =
        rt.global().getProperty(rt, "updateJSProps");
    assert(
        maybeJSPropsUpdater.isObject() &&
        "[Reanimated] `updateJSProps` not found");
    jsi::Function jsPropsUpdater =
        maybeJSPropsUpdater.asObject(rt).asFunction(rt);
    jsPropsUpdater.call(rt, viewTag, nonAnimatableProps);
  }

  bool hasLayoutUpdates = false;
  for (const auto &[shadowNode, props] : updatesBatch) {
    if (isThereAnyLayoutProp(rt, props->asObject(rt))) {
      hasLayoutUpdates = true;
      break;
    }
  }

  if (!hasLayoutUpdates) {
    // If there's no layout props to be updated, we can apply the updates
    // directly onto the components and skip the commit.
    for (const auto &[shadowNode, props] : updatesBatch) {
      Tag tag = shadowNode->getTag();
      synchronouslyUpdateUIPropsFunction_(rt, tag, props->asObject(rt));
    }
    return;
  }

  if (updatesRegistryManager_->shouldReanimatedSkipCommit()) {
    // It may happen that `performOperations` is called on the UI thread
    // while React Native tries to commit a new tree on the JS thread.
    // In this case, we should skip the commit here and let React Native do
    // it. The commit will include the current values from the updates manager
    // which will be applied in ReanimatedCommitHook.
    return;
  }

  react_native_assert(uiManager_ != nullptr);
  const auto &shadowTreeRegistry = uiManager_->getShadowTreeRegistry();

  std::unordered_map<SurfaceId, PropsMap> propsMapBySurface;

  for (auto const &[shadowNode, props] : updatesBatch) {
    SurfaceId surfaceId = shadowNode->getSurfaceId();
    auto family = &shadowNode->getFamily();
    react_native_assert(family->getSurfaceId() == surfaceId);
    propsMapBySurface[surfaceId][family].emplace_back(rt, std::move(*props));
  }

  for (auto const &[surfaceId, propsMap] : propsMapBySurface) {
    shadowTreeRegistry.visit(surfaceId, [&](ShadowTree const &shadowTree) {
      shadowTree.commit(
          [&](RootShadowNode const &oldRootShadowNode)
              -> RootShadowNode::Unshared {
            if (updatesRegistryManager_->shouldReanimatedSkipCommit()) {
              return nullptr;
            }

            auto rootNode =
                cloneShadowTreeWithNewProps(oldRootShadowNode, propsMap);

            // Mark the commit as Reanimated commit so that we can distinguish
            // it in ReanimatedCommitHook.

            auto reaShadowNode =
                std::reinterpret_pointer_cast<ReanimatedCommitShadowNode>(
                    rootNode);
            reaShadowNode->setReanimatedCommitTrait();

            return rootNode;
          },
          {/* .enableStateReconciliation = */
           false,
           /* .mountSynchronously = */ true});
    });

    // Clear the entire cache after the commit
    // (we don't know if the view is updated from outside of Reanimated
    // so we have to clear the entire cache)
    auto &viewPropsRepository = ViewPropsRepository::getInstance();
    viewPropsRepository.clear();
  }
}

void ReanimatedModuleProxy::dispatchCommand(
    jsi::Runtime &rt,
    const jsi::Value &shadowNodeValue,
    const jsi::Value &commandNameValue,
    const jsi::Value &argsValue) {
  ShadowNode::Shared shadowNode = shadowNodeFromValue(rt, shadowNodeValue);
  std::string commandName = stringFromValue(rt, commandNameValue);
  folly::dynamic args = commandArgsFromValue(rt, argsValue);
  uiManager_->dispatchCommand(shadowNode, commandName, args);
}

jsi::String ReanimatedModuleProxy::obtainProp(
    jsi::Runtime &rt,
    const jsi::Value &shadowNodeWrapper,
    const jsi::Value &propName) {
  jsi::Runtime &uiRuntime =
      workletsModuleProxy_->getUIWorkletRuntime()->getJSIRuntime();
  const auto propNameStr = propName.asString(rt).utf8(rt);
  const auto shadowNode = shadowNodeFromValue(rt, shadowNodeWrapper);
  const auto resultStr =
      obtainPropFromShadowNode(uiRuntime, propNameStr, shadowNode);
  return jsi::String::createFromUtf8(rt, resultStr);
}

jsi::Value ReanimatedModuleProxy::measure(
    jsi::Runtime &rt,
    const jsi::Value &shadowNodeValue) {
  // based on implementation from UIManagerBinding.cpp

  auto shadowNode = shadowNodeFromValue(rt, shadowNodeValue);
  auto layoutMetrics = uiManager_->getRelativeLayoutMetrics(
      *shadowNode, nullptr, {/* .includeTransform = */ true});

  if (layoutMetrics == EmptyLayoutMetrics) {
    // Originally, in this case React Native returns `{0, 0, 0, 0, 0, 0}`,
    // most likely due to the type of measure callback function which accepts
    // just an array of numbers (not null). In Reanimated, `measure` returns
    // `MeasuredDimensions | null`.
    return jsi::Value::null();
  }
  auto newestCloneOfShadowNode =
      uiManager_->getNewestCloneOfShadowNode(*shadowNode);

  auto layoutableShadowNode =
      dynamic_cast<LayoutableShadowNode const *>(newestCloneOfShadowNode.get());
  facebook::react::Point originRelativeToParent =
      layoutableShadowNode != nullptr
      ? layoutableShadowNode->getLayoutMetrics().frame.origin
      : facebook::react::Point();

  auto frame = layoutMetrics.frame;

  jsi::Object result(rt);
  result.setProperty(
      rt, "x", jsi::Value(static_cast<double>(originRelativeToParent.x)));
  result.setProperty(
      rt, "y", jsi::Value(static_cast<double>(originRelativeToParent.y)));
  result.setProperty(
      rt, "width", jsi::Value(static_cast<double>(frame.size.width)));
  result.setProperty(
      rt, "height", jsi::Value(static_cast<double>(frame.size.height)));
  result.setProperty(
      rt, "pageX", jsi::Value(static_cast<double>(frame.origin.x)));
  result.setProperty(
      rt, "pageY", jsi::Value(static_cast<double>(frame.origin.y)));
  return result;
}

void ReanimatedModuleProxy::initializeFabric(
    const std::shared_ptr<UIManager> &uiManager) {
  uiManager_ = uiManager;
  ViewPropsRepository::getInstance().setUIManager(uiManager);

  initializeLayoutAnimationsProxy();

  mountHook_ = std::make_shared<ReanimatedMountHook>(
      uiManager_, updatesRegistryManager_);
  commitHook_ = std::make_shared<ReanimatedCommitHook>(
      uiManager_, updatesRegistryManager_, layoutAnimationsProxy_);
}

void ReanimatedModuleProxy::initializeLayoutAnimationsProxy() {
  uiManager_->setAnimationDelegate(nullptr);
  auto scheduler = reinterpret_cast<Scheduler *>(uiManager_->getDelegate());
  auto componentDescriptorRegistry =
      scheduler->getContextContainer()
          ->at<std::weak_ptr<const ComponentDescriptorRegistry>>(
              "ComponentDescriptorRegistry_DO_NOT_USE_PRETTY_PLEASE")
          .lock();

  if (componentDescriptorRegistry) {
    layoutAnimationsProxy_ = std::make_shared<LayoutAnimationsProxy>(
        layoutAnimationsManager_,
        componentDescriptorRegistry,
        scheduler->getContextContainer(),
        workletsModuleProxy_->getUIWorkletRuntime()->getJSIRuntime(),
        workletsModuleProxy_->getUIScheduler());
  }
}

#endif // RCT_NEW_ARCH_ENABLED

jsi::Value ReanimatedModuleProxy::subscribeForKeyboardEvents(
    jsi::Runtime &rt,
    const jsi::Value &handlerWorklet,
    const jsi::Value &isStatusBarTranslucent,
    const jsi::Value &isNavigationBarTranslucent) {
  auto shareableHandler = extractShareableOrThrow<ShareableWorklet>(
      rt,
      handlerWorklet,
      "[Reanimated] Keyboard event handler must be a worklet.");
  return subscribeForKeyboardEventsFunction_(
      COPY_CAPTURE_WITH_THIS

      (int keyboardState, int height) {
        workletsModuleProxy_->getUIWorkletRuntime()->runGuarded(
            shareableHandler, jsi::Value(keyboardState), jsi::Value(height));
      },
      isStatusBarTranslucent.getBool(),
      isNavigationBarTranslucent.getBool());
}

void ReanimatedModuleProxy::unsubscribeFromKeyboardEvents(
    jsi::Runtime &,
    const jsi::Value &listenerId) {
  unsubscribeFromKeyboardEventsFunction_(listenerId.asNumber());
}

void ReanimatedModuleProxy::invalidate() {
  // Make sure to release WorkletsModuleProxy on invalidate to allow it
  // to destroy its runtime during the invalidation stage.
  workletsModuleProxy_.reset();
}

} // namespace reanimated
