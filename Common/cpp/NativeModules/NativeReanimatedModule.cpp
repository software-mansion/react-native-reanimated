#include "NativeReanimatedModule.h"

#ifdef RCT_NEW_ARCH_ENABLED
#include <react/renderer/uimanager/UIManagerBinding.h>
#include <react/renderer/uimanager/primitives.h>
#endif

#include <functional>
#include <memory>
#include <thread>
#include <unordered_map>

#ifdef RCT_NEW_ARCH_ENABLED
#include "FabricUtils.h"
#include "NewestShadowNodesRegistry.h"
#include "ReanimatedUIManagerBinding.h"
#include "ShadowTreeCloner.h"
#endif

#include "EventHandlerRegistry.h"
#include "FeaturesConfig.h"
#include "ReanimatedHiddenHeaders.h"
#include "RuntimeDecorator.h"
#include "Shareables.h"
#include "WorkletEventHandler.h"

using namespace facebook;

namespace reanimated {

NativeReanimatedModule::NativeReanimatedModule(
    const std::shared_ptr<CallInvoker> &jsInvoker,
    const std::shared_ptr<Scheduler> &scheduler,
    const std::shared_ptr<jsi::Runtime> &rt,
    const std::shared_ptr<ErrorHandler> &errorHandler,
#ifdef RCT_NEW_ARCH_ENABLED
// nothing
#else
    std::function<jsi::Value(jsi::Runtime &, const int, const jsi::String &)>
        propObtainer,
#endif
    PlatformDepMethodsHolder platformDepMethodsHolder)
    : NativeReanimatedModuleSpec(jsInvoker),
      RuntimeManager(rt, errorHandler, scheduler, RuntimeType::UI),
      eventHandlerRegistry(std::make_unique<EventHandlerRegistry>()),
      requestRender(platformDepMethodsHolder.requestRender),
#ifdef RCT_NEW_ARCH_ENABLED
// nothing
#else
      propObtainer(propObtainer),
#endif
      animatedSensorModule(platformDepMethodsHolder),
#ifdef RCT_NEW_ARCH_ENABLED
      synchronouslyUpdateUIPropsFunction(
          platformDepMethodsHolder.synchronouslyUpdateUIPropsFunction)
#else
      configurePropsPlatformFunction(
          platformDepMethodsHolder.configurePropsFunction)
#endif
{
  auto requestAnimationFrame = [=](jsi::Runtime &rt, const jsi::Value &fn) {
    auto jsFunction = std::make_shared<jsi::Value>(rt, fn);
    frameCallbacks.push_back([=](double timestamp) {
      runtimeHelper->runOnUIGuarded(*jsFunction, jsi::Value(timestamp));
    });
    maybeRequestRender();
  };

  auto scheduleOnJS = [this](
                          jsi::Runtime &rt,
                          const jsi::Value &remoteFun,
                          const jsi::Value &argsValue) {
    auto shareableRemoteFun = extractShareableOrThrow<ShareableRemoteFunction>(
        rt,
        remoteFun,
        "Incompatible object passed to scheduleOnJS. It is only allowed to schedule functions defined on the React Native JS runtime this way.");
    auto shareableArgs = argsValue.isUndefined()
        ? nullptr
        : extractShareableOrThrow(rt, argsValue);
    auto jsRuntime = this->runtimeHelper->rnRuntime();
    this->scheduler->scheduleOnJS([=] {
      jsi::Runtime &rt = *jsRuntime;
      auto remoteFun = shareableRemoteFun->getJSValue(rt);
      if (shareableArgs == nullptr) {
        // fast path for remote function w/o arguments
        remoteFun.asObject(rt).asFunction(rt).call(rt);
      } else {
        auto argsArray = shareableArgs->getJSValue(rt).asObject(rt).asArray(rt);
        auto argsSize = argsArray.size(rt);
        // number of arguments is typically relatively small so it is ok to
        // to use VLAs here, hence disabling the lint rule
        jsi::Value args[argsSize]; // NOLINT(runtime/arrays)
        for (size_t i = 0; i < argsSize; i++) {
          args[i] = argsArray.getValueAtIndex(rt, i);
        }
        remoteFun.asObject(rt).asFunction(rt).call(rt, args, argsSize);
      }
    });
  };

  auto makeShareableClone = [this](jsi::Runtime &rt, const jsi::Value &value) {
    return this->makeShareableClone(rt, value);
  };

  auto updateDataSynchronously =
      [this](
          jsi::Runtime &rt,
          const jsi::Value &synchronizedDataHolderRef,
          const jsi::Value &newData) {
        return this->updateDataSynchronously(
            rt, synchronizedDataHolderRef, newData);
      };

#ifdef RCT_NEW_ARCH_ENABLED
  auto updateProps = [this](
                         jsi::Runtime &rt,
                         const jsi::Value &shadowNodeValue,
                         const jsi::Value &props) {
    this->updateProps(rt, shadowNodeValue, props);
  };

  auto removeShadowNodeFromRegistry =
      [this](jsi::Runtime &rt, const jsi::Value &shadowNodeValue) {
        this->removeShadowNodeFromRegistry(rt, shadowNodeValue);
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
#endif

  RuntimeDecorator::decorateUIRuntime(
      *runtime,
#ifdef RCT_NEW_ARCH_ENABLED
      updateProps,
      measure,
      removeShadowNodeFromRegistry,
      dispatchCommand,
#else
      platformDepMethodsHolder.updatePropsFunction,
      platformDepMethodsHolder.measureFunction,
      platformDepMethodsHolder.scrollToFunction,
#endif
      requestAnimationFrame,
      scheduleOnJS,
      makeShareableClone,
      updateDataSynchronously,
      platformDepMethodsHolder.getCurrentTime,
      platformDepMethodsHolder.registerSensor,
      platformDepMethodsHolder.unregisterSensor,
      platformDepMethodsHolder.setGestureStateFunction,
      platformDepMethodsHolder.progressLayoutAnimation,
      platformDepMethodsHolder.endLayoutAnimation);
  onRenderCallback = [this](double timestampMs) {
    this->renderRequested = false;
    this->onRender(timestampMs);
  };

#ifdef RCT_NEW_ARCH_ENABLED
  // nothing
#else
  updatePropsFunction = platformDepMethodsHolder.updatePropsFunction;
#endif
  subscribeForKeyboardEventsFunction =
      platformDepMethodsHolder.subscribeForKeyboardEvents;
  unsubscribeFromKeyboardEventsFunction =
      platformDepMethodsHolder.unsubscribeFromKeyboardEvents;
}

void NativeReanimatedModule::installCoreFunctions(
    jsi::Runtime &rt,
    const jsi::Value &callGuard,
    const jsi::Value &valueUnpacker) {
  if (!runtimeHelper) {
    // initialize runtimeHelper here if not already present. We expect only one
    // instace of the helper to exists.
    runtimeHelper =
        std::make_shared<JSRuntimeHelper>(&rt, this->runtime.get(), scheduler);
  }
  runtimeHelper->callGuard =
      std::make_unique<CoreFunction>(runtimeHelper.get(), callGuard);
  runtimeHelper->valueUnpacker =
      std::make_unique<CoreFunction>(runtimeHelper.get(), valueUnpacker);
}

NativeReanimatedModule::~NativeReanimatedModule() {
  if (runtimeHelper) {
    runtimeHelper->callGuard = nullptr;
    runtimeHelper->valueUnpacker = nullptr;
    // event handler registry and frame callbacks store some JSI values from UI
    // runtime, so they have to go away before we tear down the runtime
    eventHandlerRegistry.reset();
    frameCallbacks.clear();
    runtime.reset();
    // make sure uiRuntimeDestroyed is set after the runtime is deallocated
    runtimeHelper->uiRuntimeDestroyed = true;
  }
}

void NativeReanimatedModule::scheduleOnUI(
    jsi::Runtime &rt,
    const jsi::Value &worklet) {
  auto shareableWorklet = extractShareableOrThrow(rt, worklet);
  assert(
      shareableWorklet->valueType() == Shareable::WorkletType &&
      "only worklets can be scheduled to run on UI");
  scheduler->scheduleOnUI([=] {
    jsi::Runtime &rt = *runtimeHelper->uiRuntime();
    auto workletValue = shareableWorklet->getJSValue(rt);
    runtimeHelper->runOnUIGuarded(workletValue);
  });
}

jsi::Value NativeReanimatedModule::makeSynchronizedDataHolder(
    jsi::Runtime &rt,
    const jsi::Value &initialShareable) {
  auto dataHolder = std::make_shared<ShareableSynchronizedDataHolder>(
      runtimeHelper, rt, initialShareable);
  return dataHolder->getJSValue(rt);
}

void NativeReanimatedModule::updateDataSynchronously(
    jsi::Runtime &rt,
    const jsi::Value &synchronizedDataHolderRef,
    const jsi::Value &newData) {
  auto dataHolder = extractShareableOrThrow<ShareableSynchronizedDataHolder>(
      rt, synchronizedDataHolderRef);
  dataHolder->set(rt, newData);
}

jsi::Value NativeReanimatedModule::getDataSynchronously(
    jsi::Runtime &rt,
    const jsi::Value &synchronizedDataHolderRef) {
  auto dataHolder = extractShareableOrThrow<ShareableSynchronizedDataHolder>(
      rt, synchronizedDataHolderRef);
  return dataHolder->get(rt);
}

jsi::Value NativeReanimatedModule::makeShareableClone(
    jsi::Runtime &rt,
    const jsi::Value &value) {
  std::shared_ptr<Shareable> shareable;
  if (value.isObject()) {
    auto object = value.asObject(rt);
    if (!object.getProperty(rt, "__workletHash").isUndefined()) {
      shareable = std::make_shared<ShareableWorklet>(runtimeHelper, rt, object);
    } else if (!object.getProperty(rt, "__init").isUndefined()) {
      shareable = std::make_shared<ShareableHandle>(runtimeHelper, rt, object);
    } else if (object.isFunction(rt)) {
      shareable = std::make_shared<ShareableRemoteFunction>(
          runtimeHelper, rt, object.asFunction(rt));
    } else if (object.isArray(rt)) {
      shareable = std::make_shared<ShareableArray>(
          runtimeHelper, rt, object.asArray(rt));
#ifdef RCT_NEW_ARCH_ENABLED
    } else if (object.isHostObject<ShadowNodeWrapper>(rt)) {
      shareable = std::make_shared<ShareableShadowNodeWrapper>(
          runtimeHelper, rt, object);
#endif
    } else {
      shareable = std::make_shared<ShareableObject>(runtimeHelper, rt, object);
    }
  } else if (value.isString()) {
    shareable = std::make_shared<ShareableString>(rt, value.asString(rt));
  } else if (value.isUndefined()) {
    shareable = std::make_shared<ShareableScalar>();
  } else if (value.isNull()) {
    shareable = std::make_shared<ShareableScalar>(nullptr);
  } else if (value.isBool()) {
    shareable = std::make_shared<ShareableScalar>(value.getBool());
  } else if (value.isNumber()) {
    shareable = std::make_shared<ShareableScalar>(value.getNumber());
  } else {
    throw std::runtime_error("attempted to convert an unsupported value type");
  }
  return ShareableJSRef::newHostObject(rt, shareable);
}

jsi::Value NativeReanimatedModule::registerEventHandler(
    jsi::Runtime &rt,
    const jsi::Value &eventHash,
    const jsi::Value &worklet) {
  static unsigned long EVENT_HANDLER_ID = 1;

  unsigned long newRegistrationId = EVENT_HANDLER_ID++;
  auto eventName = eventHash.asString(rt).utf8(rt);
  auto handlerShareable = extractShareableOrThrow(rt, worklet);

  scheduler->scheduleOnUI([=] {
    jsi::Runtime &rt = *runtimeHelper->uiRuntime();
    auto handlerFunction =
        handlerShareable->getJSValue(rt).asObject(rt).asFunction(rt);
    auto handler = std::make_shared<WorkletEventHandler>(
        newRegistrationId, eventName, std::move(handlerFunction));
    eventHandlerRegistry->registerEventHandler(handler);
  });

  return jsi::Value(static_cast<double>(newRegistrationId));
}

void NativeReanimatedModule::unregisterEventHandler(
    jsi::Runtime &rt,
    const jsi::Value &registrationId) {
  unsigned long id = registrationId.asNumber();
  scheduler->scheduleOnUI(
      [=] { eventHandlerRegistry->unregisterEventHandler(id); });
}

jsi::Value NativeReanimatedModule::getViewProp(
    jsi::Runtime &rt,
    const jsi::Value &viewTag,
    const jsi::Value &propName,
    const jsi::Value &callback) {
  const int viewTagInt = static_cast<int>(viewTag.asNumber());
  std::string propNameStr = propName.asString(rt).utf8(rt);
  jsi::Function fun = callback.getObject(rt).asFunction(rt);
  std::shared_ptr<jsi::Function> funPtr =
      std::make_shared<jsi::Function>(std::move(fun));

  scheduler->scheduleOnUI([&rt, viewTagInt, funPtr, this, propNameStr]() {
    const jsi::String propNameValue =
        jsi::String::createFromUtf8(rt, propNameStr);
    jsi::Value result = propObtainer(rt, viewTagInt, propNameValue);
    std::string resultStr = result.asString(rt).utf8(rt);

    scheduler->scheduleOnJS([&rt, resultStr, funPtr]() {
      const jsi::String resultValue =
          jsi::String::createFromUtf8(rt, resultStr);
      funPtr->call(rt, resultValue);
    });
  });

  return jsi::Value::undefined();
}

jsi::Value NativeReanimatedModule::enableLayoutAnimations(
    jsi::Runtime &rt,
    const jsi::Value &config) {
  FeaturesConfig::setLayoutAnimationEnabled(config.getBool());
  return jsi::Value::undefined();
}

jsi::Value NativeReanimatedModule::configureProps(
    jsi::Runtime &rt,
    const jsi::Value &uiProps,
    const jsi::Value &nativeProps) {
#ifdef RCT_NEW_ARCH_ENABLED
  jsi::Array array = nativeProps.asObject(rt).asArray(rt);
  for (int i = 0; i < array.size(rt); ++i) {
    std::string name = array.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    nativePropNames_.insert(name);
  }
#else
  configurePropsPlatformFunction(rt, uiProps, nativeProps);
#endif // RCT_NEW_ARCH_ENABLED

  return jsi::Value::undefined();
}

jsi::Value NativeReanimatedModule::configureLayoutAnimation(
    jsi::Runtime &rt,
    const jsi::Value &viewTag,
    const jsi::Value &type,
    const jsi::Value &config) {
  layoutAnimationsManager_.configureAnimation(
      viewTag.asNumber(),
      type.asString(rt).utf8(rt),
      extractShareableOrThrow(rt, config));
  return jsi::Value::undefined();
}

void NativeReanimatedModule::onEvent(
    std::string eventName,
#ifdef RCT_NEW_ARCH_ENABLED
    jsi::Value &&payload
#else
    std::string eventAsString
#endif
    /**/) {
  try {
#ifdef RCT_NEW_ARCH_ENABLED
    eventHandlerRegistry->processEvent(*runtime, eventName, payload);
#else
    eventHandlerRegistry->processEvent(*runtime, eventName, eventAsString);
#endif
  } catch (std::exception &e) {
    std::string str = e.what();
    this->errorHandler->setError(str);
    this->errorHandler->raise();
  } catch (...) {
    std::string str = "OnEvent error";
    this->errorHandler->setError(str);
    this->errorHandler->raise();
  }
}

bool NativeReanimatedModule::isAnyHandlerWaitingForEvent(
    std::string eventName) {
  return eventHandlerRegistry->isAnyHandlerWaitingForEvent(eventName);
}

void NativeReanimatedModule::maybeRequestRender() {
  if (!renderRequested) {
    renderRequested = true;
    requestRender(onRenderCallback, *this->runtime);
  }
}

void NativeReanimatedModule::onRender(double timestampMs) {
  try {
    std::vector<FrameCallback> callbacks = frameCallbacks;
    frameCallbacks.clear();
    for (auto &callback : callbacks) {
      callback(timestampMs);
    }
  } catch (std::exception &e) {
    std::string str = e.what();
    this->errorHandler->setError(str);
    this->errorHandler->raise();
  } catch (...) {
    std::string str = "OnRender error";
    this->errorHandler->setError(str);
    this->errorHandler->raise();
  }
}

jsi::Value NativeReanimatedModule::registerSensor(
    jsi::Runtime &rt,
    const jsi::Value &sensorType,
    const jsi::Value &interval,
    const jsi::Value &sensorDataHandler) {
  return animatedSensorModule.registerSensor(
      rt, runtimeHelper, sensorType, interval, sensorDataHandler);
}

void NativeReanimatedModule::unregisterSensor(
    jsi::Runtime &rt,
    const jsi::Value &sensorId) {
  animatedSensorModule.unregisterSensor(sensorId);
}

#ifdef RCT_NEW_ARCH_ENABLED
bool NativeReanimatedModule::isThereAnyLayoutProp(
    jsi::Runtime &rt,
    const jsi::Value &props) {
  const jsi::Array propNames = props.asObject(rt).getPropertyNames(rt);
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

bool NativeReanimatedModule::handleEvent(
    const std::string &eventName,
    jsi::Value &&payload,
    double currentTime) {
  jsi::Runtime &rt = *runtime.get();
  jsi::Object global = rt.global();
  jsi::String eventTimestampName =
      jsi::String::createFromAscii(rt, "_eventTimestamp");
  global.setProperty(rt, eventTimestampName, currentTime);
  onEvent(eventName, std::move(payload));
  global.setProperty(rt, eventTimestampName, jsi::Value::undefined());

  // TODO: return true if Reanimated successfully handled the event
  // to avoid sending it to JavaScript
  return false;
}

bool NativeReanimatedModule::handleRawEvent(
    const RawEvent &rawEvent,
    double currentTime) {
  const EventTarget *eventTarget = rawEvent.eventTarget.get();
  if (eventTarget == nullptr) {
    // after app reload scrollview is unmounted and its content offset is set to
    // 0 and view is thrown into recycle pool setting content offset triggers
    // scroll event eventTarget is null though, because it's unmounting we can
    // just ignore this event, because it's an event on unmounted component
    return false;
  }
  const std::string &type = rawEvent.type;
  const ValueFactory &payloadFactory = rawEvent.payloadFactory;

  int tag = eventTarget->getTag();
  std::string eventType = type;
  if (eventType.rfind("top", 0) == 0) {
    eventType = "on" + eventType.substr(3);
  }
  std::string eventName = std::to_string(tag) + eventType;
  jsi::Runtime &rt = *runtime.get();
  jsi::Value payload = payloadFactory(rt);

  return handleEvent(eventName, std::move(payload), currentTime);
}

void NativeReanimatedModule::updateProps(
    jsi::Runtime &rt,
    const jsi::Value &shadowNodeValue,
    const jsi::Value &props) {
  ShadowNode::Shared shadowNode = shadowNodeFromValue(rt, shadowNodeValue);

  // TODO: support multiple surfaces
  surfaceId_ = shadowNode->getSurfaceId();

  if (isThereAnyLayoutProp(rt, props)) {
    operationsInBatch_.emplace_back(
        shadowNode, std::make_unique<jsi::Value>(rt, props));
  } else {
    // TODO: batch with layout props changes?
    Tag tag = shadowNode->getTag();
    synchronouslyUpdateUIPropsFunction(rt, tag, props);
  }
}

void NativeReanimatedModule::performOperations() {
  if (operationsInBatch_.empty()) {
    return;
  }

  auto copiedOperationsQueue = std::move(operationsInBatch_);
  operationsInBatch_ =
      std::vector<std::pair<ShadowNode::Shared, std::unique_ptr<jsi::Value>>>();

  auto copiedTagsToRemove = std::move(tagsToRemove_);
  tagsToRemove_ = std::vector<Tag>();

  react_native_assert(uiManager_ != nullptr);
  const auto &shadowTreeRegistry = uiManager_->getShadowTreeRegistry();
  jsi::Runtime &rt = *runtime.get();

  shadowTreeRegistry.visit(surfaceId_, [&](ShadowTree const &shadowTree) {
    shadowTree.commit([&](RootShadowNode const &oldRootShadowNode) {
      auto rootNode = oldRootShadowNode.ShadowNode::clone(ShadowNodeFragment{});

      ShadowTreeCloner shadowTreeCloner{
          newestShadowNodesRegistry_, uiManager_, surfaceId_};

      {
        // lock once due to performance reasons
        auto lock = newestShadowNodesRegistry_->createLock();

        for (const auto &pair : copiedOperationsQueue) {
          const ShadowNodeFamily &family = pair.first->getFamily();
          react_native_assert(family.getSurfaceId() == surfaceId_);

          auto newRootNode = shadowTreeCloner.cloneWithNewProps(
              rootNode, family, RawProps(rt, *pair.second));

          if (newRootNode == nullptr) {
            // this happens when React removed the component but Reanimated
            // still tries to animate it, let's skip update for this specific
            // component
            continue;
          }
          rootNode = newRootNode;
        }

        // remove ShadowNodes and its ancestors from NewestShadowNodesRegistry
        for (auto tag : copiedTagsToRemove) {
          newestShadowNodesRegistry_->remove(tag);
        }
      }

      shadowTreeCloner.updateYogaChildren();

      return std::static_pointer_cast<RootShadowNode>(rootNode);
    });
  });
}

void NativeReanimatedModule::removeShadowNodeFromRegistry(
    jsi::Runtime &rt,
    const jsi::Value &shadowNodeValue) {
  auto shadowNode = shadowNodeFromValue(rt, shadowNodeValue);
  tagsToRemove_.push_back(shadowNode->getTag());
}

void NativeReanimatedModule::dispatchCommand(
    jsi::Runtime &rt,
    const jsi::Value &shadowNodeValue,
    const jsi::Value &commandNameValue,
    const jsi::Value &argsValue) {
  ShadowNode::Shared shadowNode = shadowNodeFromValue(rt, shadowNodeValue);
  std::string commandName = stringFromValue(rt, commandNameValue);
  folly::dynamic args = commandArgsFromValue(rt, argsValue);

  // TODO: use uiManager_->dispatchCommand once it's public
  UIManager_dispatchCommand(uiManager_, shadowNode, commandName, args);
}

jsi::Value NativeReanimatedModule::measure(
    jsi::Runtime &rt,
    const jsi::Value &shadowNodeValue) {
  // based on implementation from UIManagerBinding.cpp

  auto shadowNode = shadowNodeFromValue(rt, shadowNodeValue);
  // TODO: use uiManager_->getRelativeLayoutMetrics once it's public
  // auto layoutMetrics = uiManager_->getRelativeLayoutMetrics(
  //     *shadowNode, nullptr, {/* .includeTransform = */ true});
  auto layoutMetrics = UIManager_getRelativeLayoutMetrics(
      uiManager_, *shadowNode, nullptr, {/* .includeTransform = */ true});

  if (layoutMetrics == EmptyLayoutMetrics) {
    // Originally, in this case React Native returns `{0, 0, 0, 0, 0, 0}`, most
    // likely due to the type of measure callback function which accepts just an
    // array of numbers (not null). In Reanimated, `measure` returns
    // `MeasuredDimensions | null`.
    return jsi::Value::null();
  }
  auto newestCloneOfShadowNode =
      uiManager_->getNewestCloneOfShadowNode(*shadowNode);

  auto layoutableShadowNode =
      traitCast<LayoutableShadowNode const *>(newestCloneOfShadowNode.get());
  facebook::react::Point originRelativeToParent = layoutableShadowNode
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

void NativeReanimatedModule::setUIManager(
    std::shared_ptr<UIManager> uiManager) {
  uiManager_ = uiManager;
}

void NativeReanimatedModule::setNewestShadowNodesRegistry(
    std::shared_ptr<NewestShadowNodesRegistry> newestShadowNodesRegistry) {
  newestShadowNodesRegistry_ = newestShadowNodesRegistry;
}
#endif // RCT_NEW_ARCH_ENABLED

jsi::Value NativeReanimatedModule::subscribeForKeyboardEvents(
    jsi::Runtime &rt,
    const jsi::Value &handlerWorklet) {
  auto shareableHandler = extractShareableOrThrow(rt, handlerWorklet);
  auto uiRuntime = runtimeHelper->uiRuntime();
  return subscribeForKeyboardEventsFunction([=](int keyboardState, int height) {
    jsi::Runtime &rt = *uiRuntime;
    auto handler = shareableHandler->getJSValue(rt);
    handler.asObject(rt).asFunction(rt).call(
        rt, jsi::Value(keyboardState), jsi::Value(height));
  });
}

void NativeReanimatedModule::unsubscribeFromKeyboardEvents(
    jsi::Runtime &rt,
    const jsi::Value &listenerId) {
  unsubscribeFromKeyboardEventsFunction(listenerId.asNumber());
}

} // namespace reanimated
