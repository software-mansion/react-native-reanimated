#include <reanimated/NativeModules/NativeReanimatedModule.h>
#include <reanimated/RuntimeDecorators/ReanimatedWorkletRuntimeDecorator.h>
#include <reanimated/RuntimeDecorators/UIRuntimeDecorator.h>
#include <reanimated/Tools/CollectionUtils.h>
#include <reanimated/Tools/FeaturesConfig.h>

#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/Fabric/ReanimatedCommitShadowNode.h>
#include <reanimated/Fabric/ShadowTreeCloner.h>
#endif // RCT_NEW_ARCH_ENABLED

#include <worklets/Registries/EventHandlerRegistry.h>
#include <worklets/SharedItems/Shareables.h>
#include <worklets/Tools/AsyncQueue.h>
#include <worklets/Tools/WorkletEventHandler.h>

#ifdef __ANDROID__
#include <fbjni/fbjni.h>
#endif // __ANDROID__

#ifdef RCT_NEW_ARCH_ENABLED
#include <react/renderer/scheduler/Scheduler.h>
#include <react/renderer/uimanager/UIManagerBinding.h>
#include <react/renderer/uimanager/primitives.h>
#if REACT_NATIVE_MINOR_VERSION >= 73
#include <react/utils/CoreFeatures.h>
#endif // REACT_NATIVE_MINOR_VERSION
#endif // RCT_NEW_ARCH_ENABLED

#include <functional>
#include <utility>

#ifdef RCT_NEW_ARCH_ENABLED
#include <iomanip>
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

#if REACT_NATIVE_MINOR_VERSION == 73 && defined(RCT_NEW_ARCH_ENABLED)
// Android can't find the definition of this static field
bool CoreFeatures::useNativeState;
#endif

namespace reanimated {

NativeReanimatedModule::NativeReanimatedModule(
    jsi::Runtime &rnRuntime,
    const std::shared_ptr<JSScheduler> &jsScheduler,
    const std::shared_ptr<MessageQueueThread> &jsQueue,
    const std::shared_ptr<UIScheduler> &uiScheduler,
    const PlatformDepMethodsHolder &platformDepMethodsHolder,
    const std::string &valueUnpackerCode,
    const bool isBridgeless,
    const bool isReducedMotion)
    : NativeReanimatedModuleSpec(
          isBridgeless ? nullptr : jsScheduler->getJSCallInvoker()),
      isBridgeless_(isBridgeless),
      isReducedMotion_(isReducedMotion),
      jsQueue_(jsQueue),
      jsScheduler_(jsScheduler),
      uiScheduler_(uiScheduler),
      uiWorkletRuntime_(std::make_shared<WorkletRuntime>(
          rnRuntime,
          jsQueue,
          jsScheduler_,
          "Reanimated UI runtime",
          true /* supportsLocking */,
          valueUnpackerCode)),
      valueUnpackerCode_(valueUnpackerCode),
      eventHandlerRegistry_(std::make_unique<EventHandlerRegistry>()),
      requestRender_(platformDepMethodsHolder.requestRender),
      onRenderCallback_([this](const double timestampMs) {
        renderRequested_ = false;
        onRender(timestampMs);
      }),
      animatedSensorModule_(platformDepMethodsHolder),
      jsLogger_(std::make_shared<JSLogger>(jsScheduler_)),
      layoutAnimationsManager_(
          std::make_shared<LayoutAnimationsManager>(jsLogger_)),
#ifdef RCT_NEW_ARCH_ENABLED
      synchronouslyUpdateUIPropsFunction_(
          platformDepMethodsHolder.synchronouslyUpdateUIPropsFunction),
      propsRegistry_(std::make_shared<PropsRegistry>()),
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
}

void NativeReanimatedModule::commonInit(
    const PlatformDepMethodsHolder &platformDepMethodsHolder) {
  auto requestAnimationFrame =
      [this](jsi::Runtime &rt, const jsi::Value &callback) {
        this->requestAnimationFrame(rt, callback);
      };

#ifdef RCT_NEW_ARCH_ENABLED
  auto updateProps = [this](jsi::Runtime &rt, const jsi::Value &operations) {
    this->updateProps(rt, operations);
  };

  auto removeFromPropsRegistry =
      [this](jsi::Runtime &rt, const jsi::Value &viewTags) {
        this->removeFromPropsRegistry(rt, viewTags);
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

  jsi::Runtime &uiRuntime = uiWorkletRuntime_->getJSIRuntime();
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

NativeReanimatedModule::~NativeReanimatedModule() {
  // event handler registry and frame callbacks store some JSI values from UI
  // runtime, so they have to go away before we tear down the runtime
  eventHandlerRegistry_.reset();
  frameCallbacks_.clear();
  uiWorkletRuntime_.reset();
}

void NativeReanimatedModule::scheduleOnUI(
    jsi::Runtime &rt,
    const jsi::Value &worklet) {
  auto shareableWorklet = extractShareableOrThrow<ShareableWorklet>(
      rt, worklet, "[Reanimated] Only worklets can be scheduled to run on UI.");
  uiScheduler_->scheduleOnUI(COPY_CAPTURE_WITH_THIS {
#if JS_RUNTIME_HERMES
    // JSI's scope defined here allows for JSI-objects to be cleared up
    // after each runtime loop. Within these loops we typically create some
    // temporary JSI objects and hence it allows for such objects to be
    // garbage collected much sooner. Apparently the scope API is only
    // supported on Hermes at the moment.
    const auto scope = jsi::Scope(uiWorkletRuntime_->getJSIRuntime());
#endif
    uiWorkletRuntime_->runGuarded(shareableWorklet);
  });
}

jsi::Value NativeReanimatedModule::executeOnUIRuntimeSync(
    jsi::Runtime &rt,
    const jsi::Value &worklet) {
  return uiWorkletRuntime_->executeSync(rt, worklet);
}

jsi::Value NativeReanimatedModule::createWorkletRuntime(
    jsi::Runtime &rt,
    const jsi::Value &name,
    const jsi::Value &initializer) {
  auto workletRuntime = std::make_shared<WorkletRuntime>(
      rt,
      jsQueue_,
      jsScheduler_,
      name.asString(rt).utf8(rt),
      false /* supportsLocking */,
      valueUnpackerCode_);
  auto initializerShareable = extractShareableOrThrow<ShareableWorklet>(
      rt, initializer, "[Reanimated] Initializer must be a worklet.");
  workletRuntime->runGuarded(initializerShareable);
  ReanimatedWorkletRuntimeDecorator::decorate(workletRuntime->getJSIRuntime());
  return jsi::Object::createFromHostObject(rt, workletRuntime);
}

jsi::Value NativeReanimatedModule::scheduleOnRuntime(
    jsi::Runtime &rt,
    const jsi::Value &workletRuntimeValue,
    const jsi::Value &shareableWorkletValue) {
  reanimated::scheduleOnRuntime(rt, workletRuntimeValue, shareableWorkletValue);
  return jsi::Value::undefined();
}

jsi::Value NativeReanimatedModule::makeShareableClone(
    jsi::Runtime &rt,
    const jsi::Value &value,
    const jsi::Value &shouldRetainRemote,
    const jsi::Value &nativeStateSource) {
  return reanimated::makeShareableClone(
      rt, value, shouldRetainRemote, nativeStateSource);
}

jsi::Value NativeReanimatedModule::registerEventHandler(
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

  uiScheduler_->scheduleOnUI(COPY_CAPTURE_WITH_THIS {
    auto handler = std::make_shared<WorkletEventHandler>(
        newRegistrationId, eventNameStr, emitterReactTagInt, handlerShareable);
    eventHandlerRegistry_->registerEventHandler(std::move(handler));
  });

  return jsi::Value(static_cast<double>(newRegistrationId));
}

void NativeReanimatedModule::unregisterEventHandler(
    jsi::Runtime &,
    const jsi::Value &registrationId) {
  uint64_t id = registrationId.asNumber();
  uiScheduler_->scheduleOnUI(
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

std::string NativeReanimatedModule::obtainPropFromShadowNode(
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

jsi::Value NativeReanimatedModule::getViewProp(
    jsi::Runtime &rnRuntime,
    const jsi::Value &shadowNodeWrapper,
    const jsi::Value &propName,
    const jsi::Value &callback) {
  const auto propNameStr = propName.asString(rnRuntime).utf8(rnRuntime);
  const auto funPtr = std::make_shared<jsi::Function>(
      callback.getObject(rnRuntime).asFunction(rnRuntime));
  const auto shadowNode = shadowNodeFromValue(rnRuntime, shadowNodeWrapper);
  uiScheduler_->scheduleOnUI([=]() {
    jsi::Runtime &uiRuntime = uiWorkletRuntime_->getJSIRuntime();
    const auto resultStr =
        obtainPropFromShadowNode(uiRuntime, propNameStr, shadowNode);

    jsScheduler_->scheduleOnJS([=](jsi::Runtime &rnRuntime) {
      const auto resultValue =
          jsi::String::createFromUtf8(rnRuntime, resultStr);
      funPtr->call(rnRuntime, resultValue);
    });
  });
  return jsi::Value::undefined();
}

#else

jsi::Value NativeReanimatedModule::getViewProp(
    jsi::Runtime &rnRuntime,
    const jsi::Value &viewTag,
    const jsi::Value &propName,
    const jsi::Value &callback) {
  const auto propNameStr = propName.asString(rnRuntime).utf8(rnRuntime);
  const auto funPtr = std::make_shared<jsi::Function>(
      callback.getObject(rnRuntime).asFunction(rnRuntime));

  const int viewTagInt = viewTag.asNumber();

  uiScheduler_->scheduleOnUI(
      COPY_CAPTURE_WITH_THIS

      () {
        jsi::Runtime &uiRuntime = uiWorkletRuntime_->getJSIRuntime();
        const jsi::Value propNameValue =
            jsi::String::createFromUtf8(uiRuntime, propNameStr);
        const auto resultValue =
            obtainPropFunction_(uiRuntime, viewTagInt, propNameValue);
        const auto resultStr = resultValue.asString(uiRuntime).utf8(uiRuntime);

        jsScheduler_->scheduleOnJS([=](jsi::Runtime &rnRuntime) {
          const auto resultValue =
              jsi::String::createFromUtf8(rnRuntime, resultStr);
          funPtr->call(rnRuntime, resultValue);
        });
      });
  return jsi::Value::undefined();
}

#endif

jsi::Value NativeReanimatedModule::enableLayoutAnimations(
    jsi::Runtime &,
    const jsi::Value &config) {
  FeaturesConfig::setLayoutAnimationEnabled(config.getBool());
  return jsi::Value::undefined();
}

jsi::Value NativeReanimatedModule::configureProps(
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

jsi::Value NativeReanimatedModule::configureLayoutAnimationBatch(
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

void NativeReanimatedModule::setShouldAnimateExiting(
    jsi::Runtime &rt,
    const jsi::Value &viewTag,
    const jsi::Value &shouldAnimate) {
  layoutAnimationsManager_->setShouldAnimateExiting(
      viewTag.asNumber(), shouldAnimate.getBool());
}

bool NativeReanimatedModule::isAnyHandlerWaitingForEvent(
    const std::string &eventName,
    const int emitterReactTag) {
  return eventHandlerRegistry_->isAnyHandlerWaitingForEvent(
      eventName, emitterReactTag);
}

void NativeReanimatedModule::requestAnimationFrame(
    jsi::Runtime &rt,
    const jsi::Value &callback) {
  frameCallbacks_.push_back(std::make_shared<jsi::Value>(rt, callback));
  maybeRequestRender();
}

void NativeReanimatedModule::maybeRequestRender() {
  if (!renderRequested_) {
    renderRequested_ = true;
    jsi::Runtime &uiRuntime = uiWorkletRuntime_->getJSIRuntime();
    requestRender_(onRenderCallback_, uiRuntime);
  }
}

void NativeReanimatedModule::onRender(double timestampMs) {
  auto callbacks = std::move(frameCallbacks_);
  frameCallbacks_.clear();
  jsi::Runtime &uiRuntime = uiWorkletRuntime_->getJSIRuntime();
  jsi::Value timestamp{timestampMs};
  for (const auto &callback : callbacks) {
    runOnRuntimeGuarded(uiRuntime, *callback, timestamp);
  }
}

jsi::Value NativeReanimatedModule::registerSensor(
    jsi::Runtime &rt,
    const jsi::Value &sensorType,
    const jsi::Value &interval,
    const jsi::Value &iosReferenceFrame,
    const jsi::Value &sensorDataHandler) {
  return animatedSensorModule_.registerSensor(
      rt,
      uiWorkletRuntime_,
      sensorType,
      interval,
      iosReferenceFrame,
      sensorDataHandler);
}

void NativeReanimatedModule::unregisterSensor(
    jsi::Runtime &,
    const jsi::Value &sensorId) {
  animatedSensorModule_.unregisterSensor(sensorId);
}

void NativeReanimatedModule::cleanupSensors() {
  animatedSensorModule_.unregisterAllSensors();
}

#ifdef RCT_NEW_ARCH_ENABLED
bool NativeReanimatedModule::isThereAnyLayoutProp(
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

jsi::Value NativeReanimatedModule::filterNonAnimatableProps(
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

bool NativeReanimatedModule::handleEvent(
    const std::string &eventName,
    const int emitterReactTag,
    const jsi::Value &payload,
    double currentTime) {
  eventHandlerRegistry_->processEvent(
      uiWorkletRuntime_, currentTime, eventName, emitterReactTag, payload);

  // TODO: return true if Reanimated successfully handled the event
  // to avoid sending it to JavaScript
  return false;
}

#ifdef RCT_NEW_ARCH_ENABLED
bool NativeReanimatedModule::handleRawEvent(
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
  jsi::Runtime &rt = uiWorkletRuntime_->getJSIRuntime();
#if REACT_NATIVE_MINOR_VERSION >= 73
  const auto &eventPayload = rawEvent.eventPayload;
  jsi::Value payload = eventPayload->asJSIValue(rt);
#else
  const auto &payloadFactory = rawEvent.payloadFactory;
  jsi::Value payload = payloadFactory(rt);
#endif

  auto res = handleEvent(eventType, tag, std::move(payload), currentTime);
  // TODO: we should call performOperations conditionally if event is handled
  // (res == true), but for now handleEvent always returns false. Thankfully,
  // performOperations does not trigger a lot of code if there is nothing to
  // be done so this is fine for now.
  performOperations();
  return res;
}

void NativeReanimatedModule::updateProps(
    jsi::Runtime &rt,
    const jsi::Value &operations) {
  auto array = operations.asObject(rt).asArray(rt);
  size_t length = array.size(rt);
  for (size_t i = 0; i < length; ++i) {
    auto item = array.getValueAtIndex(rt, i).asObject(rt);
    auto shadowNodeWrapper = item.getProperty(rt, "shadowNodeWrapper");
    auto shadowNode = shadowNodeFromValue(rt, shadowNodeWrapper);
    const jsi::Value &updates = item.getProperty(rt, "updates");
    operationsInBatch_.emplace_back(
        shadowNode, std::make_unique<jsi::Value>(rt, updates));

    // TODO: support multiple surfaces
    surfaceId_ = shadowNode->getSurfaceId();
  }
}

void NativeReanimatedModule::performOperations() {
  if (operationsInBatch_.empty() && tagsToRemove_.empty()) {
    // nothing to do
    return;
  }

  auto copiedOperationsQueue = std::move(operationsInBatch_);
  operationsInBatch_.clear();

  jsi::Runtime &rt = uiWorkletRuntime_->getJSIRuntime();

  {
    auto lock = propsRegistry_->createLock();

    if (copiedOperationsQueue.size() > 0 &&
        propsRegistry_->shouldReanimatedSkipCommit()) {
      propsRegistry_->pleaseCommitAfterPause();
    }

    // remove recently unmounted ShadowNodes from PropsRegistry
    if (!tagsToRemove_.empty()) {
      for (auto tag : tagsToRemove_) {
        propsRegistry_->remove(tag);
      }
      tagsToRemove_.clear();
    }

    // Even if only non-layout props are changed, we need to store the update
    // in PropsRegistry anyway so that React doesn't overwrite it in the next
    // render. Currently, only opacity and transform are treated in a special
    // way but backgroundColor, shadowOpacity etc. would get overwritten (see
    // `_propKeysManagedByAnimated_DO_NOT_USE_THIS_IS_BROKEN`).
    for (const auto &[shadowNode, props] : copiedOperationsQueue) {
      propsRegistry_->update(shadowNode, dynamicFromValue(rt, *props));
    }
  }

  for (const auto &[shadowNode, props] : copiedOperationsQueue) {
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
  for (const auto &[shadowNode, props] : copiedOperationsQueue) {
    if (isThereAnyLayoutProp(rt, props->asObject(rt))) {
      hasLayoutUpdates = true;
      break;
    }
  }

  if (!hasLayoutUpdates) {
    // If there's no layout props to be updated, we can apply the updates
    // directly onto the components and skip the commit.
    for (const auto &[shadowNode, props] : copiedOperationsQueue) {
      Tag tag = shadowNode->getTag();
      synchronouslyUpdateUIPropsFunction_(rt, tag, props->asObject(rt));
    }
    return;
  }

  if (propsRegistry_->shouldReanimatedSkipCommit()) {
    // It may happen that `performOperations` is called on the UI thread
    // while React Native tries to commit a new tree on the JS thread.
    // In this case, we should skip the commit here and let React Native do
    // it. The commit will include the current values from PropsRegistry which
    // will be applied in ReanimatedCommitHook.
    return;
  }

  react_native_assert(uiManager_ != nullptr);
  const auto &shadowTreeRegistry = uiManager_->getShadowTreeRegistry();

  shadowTreeRegistry.visit(surfaceId_, [&](ShadowTree const &shadowTree) {
    shadowTree.commit(
        [&](RootShadowNode const &oldRootShadowNode)
            -> RootShadowNode::Unshared {
          PropsMap propsMap;
          for (auto &[shadowNode, props] : copiedOperationsQueue) {
            auto family = &shadowNode->getFamily();
            react_native_assert(family->getSurfaceId() == surfaceId_);
            propsMap[family].emplace_back(rt, std::move(*props));

            if (propsRegistry_->shouldReanimatedSkipCommit()) {
              return nullptr;
            }
          }

          auto rootNode =
              cloneShadowTreeWithNewProps(oldRootShadowNode, propsMap);

          // Mark the commit as Reanimated commit so that we can distinguish it
          // in ReanimatedCommitHook.

          auto reaShadowNode =
              std::reinterpret_pointer_cast<ReanimatedCommitShadowNode>(
                  rootNode);
          reaShadowNode->setReanimatedCommitTrait();

          return rootNode;
        },
        {/* .enableStateReconciliation = */
         false,
         /* .mountSynchronously = */ true,
         /* .shouldYield = */ [this]() {
           return propsRegistry_->shouldReanimatedSkipCommit();
         }});
  });
}

void NativeReanimatedModule::removeFromPropsRegistry(
    jsi::Runtime &rt,
    const jsi::Value &viewTags) {
  auto array = viewTags.asObject(rt).asArray(rt);
  for (size_t i = 0, size = array.size(rt); i < size; ++i) {
    tagsToRemove_.push_back(array.getValueAtIndex(rt, i).asNumber());
  }
}

void NativeReanimatedModule::dispatchCommand(
    jsi::Runtime &rt,
    const jsi::Value &shadowNodeValue,
    const jsi::Value &commandNameValue,
    const jsi::Value &argsValue) {
  ShadowNode::Shared shadowNode = shadowNodeFromValue(rt, shadowNodeValue);
  std::string commandName = stringFromValue(rt, commandNameValue);
  folly::dynamic args = commandArgsFromValue(rt, argsValue);
  uiManager_->dispatchCommand(shadowNode, commandName, args);
}

jsi::String NativeReanimatedModule::obtainProp(
    jsi::Runtime &rt,
    const jsi::Value &shadowNodeWrapper,
    const jsi::Value &propName) {
  jsi::Runtime &uiRuntime = uiWorkletRuntime_->getJSIRuntime();
  const auto propNameStr = propName.asString(rt).utf8(rt);
  const auto shadowNode = shadowNodeFromValue(rt, shadowNodeWrapper);
  const auto resultStr =
      obtainPropFromShadowNode(uiRuntime, propNameStr, shadowNode);
  return jsi::String::createFromUtf8(rt, resultStr);
}

jsi::Value NativeReanimatedModule::measure(
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

void NativeReanimatedModule::initializeFabric(
    const std::shared_ptr<UIManager> &uiManager) {
  uiManager_ = uiManager;

  initializeLayoutAnimationsProxy();

  mountHook_ =
      std::make_shared<ReanimatedMountHook>(propsRegistry_, uiManager_);
  commitHook_ = std::make_shared<ReanimatedCommitHook>(
      propsRegistry_, uiManager_, layoutAnimationsProxy_);
}

void NativeReanimatedModule::initializeLayoutAnimationsProxy() {
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
        uiWorkletRuntime_->getJSIRuntime(),
        uiScheduler_);
  }
}

#endif // RCT_NEW_ARCH_ENABLED

jsi::Value NativeReanimatedModule::subscribeForKeyboardEvents(
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
        uiWorkletRuntime_->runGuarded(
            shareableHandler, jsi::Value(keyboardState), jsi::Value(height));
      },
      isStatusBarTranslucent.getBool(),
      isNavigationBarTranslucent.getBool());
}

void NativeReanimatedModule::unsubscribeFromKeyboardEvents(
    jsi::Runtime &,
    const jsi::Value &listenerId) {
  unsubscribeFromKeyboardEventsFunction_(listenerId.asNumber());
}

} // namespace reanimated
