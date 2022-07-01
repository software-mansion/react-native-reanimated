#include "NativeReanimatedModule.h"

#ifdef RCT_NEW_ARCH_ENABLED
#include <react/renderer/uimanager/UIManagerBinding.h>
#include <react/renderer/uimanager/primitives.h>
#endif

#include <functional>
#include <memory>
#include <thread>

#ifdef RCT_NEW_ARCH_ENABLED
#include "FabricUtils.h"
#include "NewestShadowNodesRegistry.h"
#include "ReanimatedUIManagerBinding.h"
#endif

#include "EventHandlerRegistry.h"
#include "FeaturesConfig.h"
#include "FrozenObject.h"
#include "JSIStoreValueUser.h"
#include "Mapper.h"
#include "MapperRegistry.h"
#include "MutableValue.h"
#include "ReanimatedHiddenHeaders.h"
#include "RuntimeDecorator.h"
#include "ShareableValue.h"
#include "WorkletEventHandler.h"

using namespace facebook;

namespace reanimated {

void extractMutables(
    jsi::Runtime &rt,
    std::shared_ptr<ShareableValue> sv,
    std::vector<std::shared_ptr<MutableValue>> &res) {
  switch (sv->type) {
    case ValueType::MutableValueType: {
      auto &mutableValue = ValueWrapper::asMutableValue(sv->valueContainer);
      res.push_back(mutableValue);
      break;
    }
    case ValueType::FrozenArrayType:
      for (auto &it : ValueWrapper::asFrozenArray(sv->valueContainer)) {
        extractMutables(rt, it, res);
      }
      break;
    case ValueType::RemoteObjectType:
    case ValueType::FrozenObjectType:
      for (auto &it : ValueWrapper::asFrozenObject(sv->valueContainer)->map) {
        extractMutables(rt, it.second, res);
      }
      break;
    default:
      break;
  }
}

std::vector<std::shared_ptr<MutableValue>> extractMutablesFromArray(
    jsi::Runtime &rt,
    const jsi::Array &array,
    NativeReanimatedModule *module) {
  std::vector<std::shared_ptr<MutableValue>> res;
  for (size_t i = 0, size = array.size(rt); i < size; i++) {
    auto shareable =
        ShareableValue::adapt(rt, array.getValueAtIndex(rt, i), module);
    extractMutables(rt, shareable, res);
  }
  return res;
}

NativeReanimatedModule::NativeReanimatedModule(
    std::shared_ptr<CallInvoker> jsInvoker,
    std::shared_ptr<Scheduler> scheduler,
    std::shared_ptr<jsi::Runtime> rt,
    std::shared_ptr<ErrorHandler> errorHandler,
#ifdef RCT_NEW_ARCH_ENABLED
// nothing
#else
    std::function<jsi::Value(jsi::Runtime &, const int, const jsi::String &)>
        propObtainer,
#endif
    std::shared_ptr<LayoutAnimationsProxy> layoutAnimationsProxy,
    PlatformDepMethodsHolder platformDepMethodsHolder)
    : NativeReanimatedModuleSpec(jsInvoker),
      RuntimeManager(rt, errorHandler, scheduler, RuntimeType::UI),
      mapperRegistry(std::make_shared<MapperRegistry>()),
      eventHandlerRegistry(std::make_shared<EventHandlerRegistry>()),
      requestRender(platformDepMethodsHolder.requestRender),
#ifdef RCT_NEW_ARCH_ENABLED
// nothing
#else
      propObtainer(propObtainer),
#endif
      animatedSensorModule(platformDepMethodsHolder, this),
#ifdef RCT_NEW_ARCH_ENABLED
      synchronouslyUpdateUIPropsFunction(
          platformDepMethodsHolder.synchronouslyUpdateUIPropsFunction)
#else
      configurePropsPlatformFunction(
          platformDepMethodsHolder.configurePropsFunction)
#endif
{
  auto requestAnimationFrame = [=](FrameCallback callback) {
    frameCallbacks.push_back(callback);
    maybeRequestRender();
  };

  this->layoutAnimationsProxy = layoutAnimationsProxy;

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
      platformDepMethodsHolder.getCurrentTime,
      platformDepMethodsHolder.registerSensor,
      platformDepMethodsHolder.unregisterSensor,
      platformDepMethodsHolder.setGestureStateFunction,
      layoutAnimationsProxy);
  onRenderCallback = [this](double timestampMs) {
    this->renderRequested = false;
    this->onRender(timestampMs);
  };

#ifdef RCT_NEW_ARCH_ENABLED
  // nothing
#else
  updatePropsFunction = platformDepMethodsHolder.updatePropsFunction;
#endif
}

void NativeReanimatedModule::installCoreFunctions(
    jsi::Runtime &rt,
    const jsi::Value &valueSetter) {
  this->valueSetter = ShareableValue::adapt(rt, valueSetter, this);
}

jsi::Value NativeReanimatedModule::makeShareable(
    jsi::Runtime &rt,
    const jsi::Value &value) {
  return ShareableValue::adapt(rt, value, this)->getValue(rt);
}

jsi::Value NativeReanimatedModule::makeMutable(
    jsi::Runtime &rt,
    const jsi::Value &value) {
  return ShareableValue::adapt(rt, value, this, ValueType::MutableValueType)
      ->getValue(rt);
}

jsi::Value NativeReanimatedModule::makeRemote(
    jsi::Runtime &rt,
    const jsi::Value &value) {
  return ShareableValue::adapt(rt, value, this, ValueType::RemoteObjectType)
      ->getValue(rt);
}

jsi::Value NativeReanimatedModule::startMapper(
    jsi::Runtime &rt,
    const jsi::Value &worklet,
    const jsi::Value &inputs,
    const jsi::Value &outputs,
    const jsi::Value &updater,
    const jsi::Value &viewDescriptors) {
  static unsigned long MAPPER_ID = 1;

  unsigned long newMapperId = MAPPER_ID++;
  auto mapperShareable = ShareableValue::adapt(rt, worklet, this);
  auto inputMutables =
      extractMutablesFromArray(rt, inputs.asObject(rt).asArray(rt), this);
  auto outputMutables =
      extractMutablesFromArray(rt, outputs.asObject(rt).asArray(rt), this);

  int optimalizationLvl = 0;
  auto optimalization =
      updater.asObject(rt).getProperty(rt, "__optimalization");
  if (optimalization.isNumber()) {
    optimalizationLvl = optimalization.asNumber();
  }
  auto updaterSV = ShareableValue::adapt(rt, updater, this);
  auto viewDescriptorsSV = ShareableValue::adapt(rt, viewDescriptors, this);

  scheduler->scheduleOnUI([=] {
    auto mapperFunction =
        mapperShareable->getValue(*runtime).asObject(*runtime).asFunction(
            *runtime);
    std::shared_ptr<jsi::Function> mapperFunctionPointer =
        std::make_shared<jsi::Function>(std::move(mapperFunction));

    std::shared_ptr<Mapper> mapperPointer = std::make_shared<Mapper>(
        this,
        newMapperId,
        mapperFunctionPointer,
        inputMutables,
        outputMutables);
    if (optimalizationLvl > 0) {
      mapperPointer->enableFastMode(
          optimalizationLvl, updaterSV, viewDescriptorsSV);
    }
    mapperRegistry->startMapper(mapperPointer);
    maybeRequestRender();
  });

  return jsi::Value(static_cast<double>(newMapperId));
}

void NativeReanimatedModule::stopMapper(
    jsi::Runtime &rt,
    const jsi::Value &mapperId) {
  unsigned long id = mapperId.asNumber();
  scheduler->scheduleOnUI([=] {
    mapperRegistry->stopMapper(id);
    maybeRequestRender();
  });
}

jsi::Value NativeReanimatedModule::registerEventHandler(
    jsi::Runtime &rt,
    const jsi::Value &eventHash,
    const jsi::Value &worklet) {
  static unsigned long EVENT_HANDLER_ID = 1;

  unsigned long newRegistrationId = EVENT_HANDLER_ID++;
  auto eventName = eventHash.asString(rt).utf8(rt);
  auto handlerShareable = ShareableValue::adapt(rt, worklet, this);

  scheduler->scheduleOnUI([=] {
    auto handlerFunction =
        handlerShareable->getValue(*runtime).asObject(*runtime).asFunction(
            *runtime);
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
    mapperRegistry->execute(*runtime);
    if (mapperRegistry->needRunOnRender()) {
      maybeRequestRender();
    }
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
    mapperRegistry->execute(*runtime);

    if (mapperRegistry->needRunOnRender()) {
      maybeRequestRender();
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
    const jsi::Value &sensorDataContainer) {
  return animatedSensorModule.registerSensor(
      rt, sensorType, interval, sensorDataContainer);
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
  auto contextContainer = getContextContainerFromUIManager(
      &*uiManager_); // TODO: use Scheduler::getContextContainer
  PropsParserContext propsParserContext{surfaceId_, *contextContainer};
  jsi::Runtime &rt = *runtime.get();

  shadowTreeRegistry.visit(surfaceId_, [&](ShadowTree const &shadowTree) {
    shadowTree.commit([&](RootShadowNode const &oldRootShadowNode) {
      // lock once due to performance reasons
      auto lock = newestShadowNodesRegistry_->createLock();

      auto rootNode = oldRootShadowNode.ShadowNode::clone(ShadowNodeFragment{});

      for (const auto &pair : copiedOperationsQueue) {
        const ShadowNodeFamily &family = pair.first->getFamily();
        react_native_assert(family.getSurfaceId() == surfaceId_);

        auto newRootNode =
            rootNode->cloneTree(family, [&](ShadowNode const &oldShadowNode) {
              const auto newest =
                  newestShadowNodesRegistry_->get(oldShadowNode.getTag());

              const auto &source = newest == nullptr ? oldShadowNode : *newest;

              const auto newProps = source.getComponentDescriptor().cloneProps(
                  propsParserContext,
                  source.getProps(),
                  RawProps(rt, *pair.second));

              return source.clone({/* .props = */ newProps});
            });

        if (newRootNode == nullptr) {
          // this happens when React removed the component but Reanimated still
          // tries to animate it, let's skip update for this specific component
          continue;
        }
        rootNode = newRootNode;

        auto ancestors = family.getAncestors(*rootNode);
        for (const auto &pair : ancestors) {
          const auto &parent = pair.first.get();
          const auto &child = parent.getChildren().at(pair.second);
          newestShadowNodesRegistry_->set(child, parent.getTag());
        }
      }

      // remove ShadowNodes and its ancestors from NewestShadowNodesRegistry
      for (auto tag : copiedTagsToRemove) {
        newestShadowNodesRegistry_->remove(tag);
      }

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
    return jsi::Value::undefined();
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

} // namespace reanimated
