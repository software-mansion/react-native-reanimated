#include <cxxreact/ReactNativeVersion.h>
#include <jsi/JSIDynamic.h>
#include <jsi/jsi.h>
#include <react/debug/react_native_assert.h>
#include <react/featureflags/ReactNativeFeatureFlags.h>
#include <react/renderer/core/RawProps.h>
#include <react/renderer/scheduler/Scheduler.h>
#include <react/renderer/uimanager/UIManagerBinding.h>
#include <react/renderer/uimanager/primitives.h>
#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/easing/EasingFunctions.h>
#include <reanimated/Compat/WorkletsApi.h>
#include <reanimated/Events/UIEventHandler.h>
#include <reanimated/Fabric/updates/PropsLayoutFilter.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxy_Experimental.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxy_Legacy.h>
#include <reanimated/NativeModules/PropValueProcessor.h>
#include <reanimated/NativeModules/ReanimatedModuleProxy.h>
#include <reanimated/NativeModules/SynchronousPropsBufferSerializer.h>
#include <reanimated/RuntimeDecorators/UIRuntimeDecorator.h>
#include <reanimated/Tools/FeatureFlags.h>
#include <reanimated/Tools/ReaJSIUtils.h>
#include <reanimated/Tools/ReanimatedSystraceSection.h>

#ifdef __ANDROID__
#include <fbjni/fbjni.h>
#endif // __ANDROID__

#include <algorithm>
#include <functional>
#include <memory>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

namespace reanimated {

using namespace worklets;

static inline std::shared_ptr<const ShadowNode> shadowNodeFromValue(
    jsi::Runtime &rt,
    const jsi::Value &shadowNodeWrapper) {
  return Bridging<std::shared_ptr<const ShadowNode>>::fromJs(rt, shadowNodeWrapper);
}

namespace {

#if REACT_NATIVE_VERSION_MINOR >= 85
void mergeAnimatedProps(AnimatedProps &target, AnimatedProps &&source) {
  if (source.rawProps) {
    if (target.rawProps) {
      auto mergedRawProps = target.rawProps->toDynamic();
      mergedRawProps.merge_patch(source.rawProps->toDynamic());
      target.rawProps = std::make_unique<RawProps>(std::move(mergedRawProps));
    } else {
      target.rawProps = std::move(source.rawProps);
    }
  }

  for (auto &prop : source.props) {
    target.props.push_back(std::move(prop));
  }
}
#endif

#ifdef ANDROID
constexpr bool shouldUseSynchronousUpdatesInPerformOperations() {
  return StaticFeatureFlags::getFlag("ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS") &&
      !StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS");
}
#elif __APPLE__
constexpr bool shouldUseSynchronousUpdatesInPerformOperations() {
  return StaticFeatureFlags::getFlag("IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS") &&
      !StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS");
}
#else
constexpr bool shouldUseSynchronousUpdatesInPerformOperations() {
  return false;
}
#endif

std::pair<UpdatesBatch, UpdatesBatch> partitionUpdates(
    const UpdatesBatch &updatesBatch,
    const bool allowPartialUpdates) {
  static const std::unordered_set<std::string> synchronousPropNames = {
      "opacity",
      "elevation",
      "zIndex",
      "shadowColor",
#if __APPLE__
      "shadowOffset",
      "shadowOpacity",
      "shadowRadius",
#endif // __APPLE__
      "backgroundColor",
      // "color", // not supported
      "tintColor",
      "placeholderTextColor",
      "borderRadius",
      "borderTopLeftRadius",
      "borderTopRightRadius",
      "borderTopStartRadius",
      "borderTopEndRadius",
      "borderBottomLeftRadius",
      "borderBottomRightRadius",
      "borderBottomStartRadius",
      "borderBottomEndRadius",
      "borderStartStartRadius",
      "borderStartEndRadius",
      "borderEndStartRadius",
      "borderEndEndRadius",
      "borderColor",
      "borderTopColor",
      "borderBottomColor",
      "borderLeftColor",
      "borderRightColor",
      "borderStartColor",
      "borderEndColor",
      "borderBlockColor",
      "borderBlockStartColor",
      "borderBlockEndColor",
      "outlineColor",
      "outlineOffset",
      "outlineWidth",
      "transform",
  };

  const auto isSynchronous = [&](const std::string &keyStr, [[maybe_unused]] const folly::dynamic &value) {
    if (!synchronousPropNames.contains(keyStr)) {
      return false;
    }
#ifdef ANDROID
    // The Android synchronous path serializes color props into an int buffer via `value.asInt()`,
    // so non-numeric color values (e.g. PlatformColor) must fall back to the shadow tree commit path.
    const bool isColorProp = keyStr.find("Color") != std::string::npos;
    if (isColorProp && !value.isNumber()) {
      return false;
    }
#endif // ANDROID
    return true;
  };

  UpdatesBatch synchronousUpdatesBatch;
  UpdatesBatch shadowTreeUpdatesBatch;

  for (const auto &[shadowNodeFamily, props] : updatesBatch) {
    if (allowPartialUpdates) {
      folly::dynamic synchronousProps = folly::dynamic::object();
      folly::dynamic shadowTreeProps = folly::dynamic::object();

      for (const auto &[key, value] : props.items()) {
        const auto keyStr = key.asString();
        if (isSynchronous(keyStr, value)) {
          synchronousProps[keyStr] = value;
        } else {
          shadowTreeProps[keyStr] = value;
        }
      }

      if (!synchronousProps.empty()) {
        synchronousUpdatesBatch.emplace_back(shadowNodeFamily, std::move(synchronousProps));
      }

      if (!shadowTreeProps.empty()) {
        shadowTreeUpdatesBatch.emplace_back(shadowNodeFamily, std::move(shadowTreeProps));
      }
    } else {
      const bool hasOnlySynchronousProps = std::all_of(props.items().begin(), props.items().end(), [&](const auto &kv) {
        return isSynchronous(kv.first.asString(), kv.second);
      });

      if (hasOnlySynchronousProps) {
        synchronousUpdatesBatch.emplace_back(shadowNodeFamily, props);
      } else {
        shadowTreeUpdatesBatch.emplace_back(shadowNodeFamily, props);
      }
    }
  }

  return {std::move(synchronousUpdatesBatch), std::move(shadowTreeUpdatesBatch)};
}

} // namespace

ReanimatedModuleProxy::ReanimatedModuleProxy(
    const std::shared_ptr<WorkletRuntime> &uiRuntime,
    const std::shared_ptr<UIScheduler> &uiScheduler,
    jsi::Runtime &rnRuntime,
    const std::shared_ptr<CallInvoker> &jsCallInvoker,
    const PlatformDepMethodsHolder &platformDepMethodsHolder,
    const bool isReducedMotion)
    : isReducedMotion_(isReducedMotion),
      uiRuntime_(uiRuntime),
      uiScheduler_(uiScheduler),
      jsInvoker_(jsCallInvoker),
      eventHandlerRegistry_(std::make_unique<UIEventHandlerRegistry>()),
      requestRender_(platformDepMethodsHolder.requestRender),
      animatedSensorModule_(platformDepMethodsHolder),
      layoutAnimationsManager_(std::make_shared<LayoutAnimationsManager>()),
      getAnimationTimestamp_(platformDepMethodsHolder.getAnimationTimestamp),
#ifdef __APPLE__
      forceScreenSnapshot_(platformDepMethodsHolder.forceScreenSnapshotFunction),
#endif
      staticPropsRegistry_(std::make_shared<StaticPropsRegistry>()),
      updatesRegistryManager_(std::make_shared<UpdatesRegistryManager>(staticPropsRegistry_)),
      operationsLoop_(std::make_shared<OperationsLoop>(
          uiScheduler,
          platformDepMethodsHolder.requestRender,
          platformDepMethodsHolder.getAnimationTimestamp,
          updatesRegistryManager_)),
      animatedPropsRegistry_(std::make_shared<AnimatedPropsRegistry>()),
      viewStylesRepository_(std::make_shared<ViewStylesRepository>(staticPropsRegistry_, animatedPropsRegistry_)),
      cssAnimationKeyframesRegistry_(std::make_shared<CSSKeyframesRegistry>()),
      cssAnimationsRegistry_(std::make_shared<CSSAnimationsRegistry>(
          operationsLoop_,
          cssAnimationKeyframesRegistry_,
          platformDepMethodsHolder.platformAnimationFactory)),
      cssTransitionsRegistry_(std::make_shared<CSSTransitionsRegistry>(
          viewStylesRepository_,
          operationsLoop_,
          std::make_shared<CSSPlatformTransitionProxy>(
              platformDepMethodsHolder.cssCanRouteProperty,
              platformDepMethodsHolder.cssApplyTransition,
              platformDepMethodsHolder.cssRemoveTransition))),
      pseudoStylesRegistry_(std::make_shared<PseudoStylesRegistry>(
          platformDepMethodsHolder.attachPseudoSelector,
          platformDepMethodsHolder.detachPseudoSelector,
          cssTransitionsRegistry_,
          updatesRegistryManager_)),
      synchronouslyUpdateUIPropsFunction_(platformDepMethodsHolder.synchronouslyUpdateUIPropsFunction),
#ifdef ANDROID
      filterUnmountedTagsFunction_(platformDepMethodsHolder.filterUnmountedTagsFunction),
#endif // ANDROID
      subscribeForKeyboardEventsFunction_(platformDepMethodsHolder.subscribeForKeyboardEvents),
      unsubscribeFromKeyboardEventsFunction_(platformDepMethodsHolder.unsubscribeFromKeyboardEvents) {
  // Add registries in order of their priority (from the lowest to the
  // highest). CSS transitions should be overriden by animated style
  // animations; animated style animations should be overriden by CSS
  // animations.
  updatesRegistryManager_->addRegistry(cssTransitionsRegistry_);
  updatesRegistryManager_->addRegistry(animatedPropsRegistry_);
  updatesRegistryManager_->addRegistry(cssAnimationsRegistry_);

#ifdef ANDROID
  // Pre-allocate the synchronous props buffers so the first frame doesn't pay
  // for vector growth allocations.
  if constexpr (StaticFeatureFlags::getFlag("ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS")) {
    synchronousPropsIntBuffer_.reserve(1024);
    synchronousPropsDoubleBuffer_.reserve(1024);
  }
#endif // ANDROID
}

void ReanimatedModuleProxy::init(const PlatformDepMethodsHolder &platformDepMethodsHolder) {
  if constexpr (StaticFeatureFlags::getFlag("USE_ANIMATION_BACKEND")) {
    // Backend path: callbacks are drained later inside runGrandCallback under
    // the manager lock; no wrap needed here.
    requestRender_ = [weakThis = weak_from_this()](std::function<void(const double)> callback) {
      auto strongThis = weakThis.lock();
      if (!strongThis) {
        return;
      }
      strongThis->pendingFrameCallbacks_.push_back(std::move(callback));
      strongThis->startBackendIfNeeded();
    };
  } else {
    // Non-backend path: wrap the platform RAF callback so the subsystem work
    // runs under the manager lock.
    requestRender_ = [weakThis = weak_from_this(), platformRequestRender = platformDepMethodsHolder.requestRender](
                         std::function<void(const double)> callback) {
      platformRequestRender([weakThis, callback = std::move(callback)](const double timestamp) {
        if (auto strongThis = weakThis.lock()) {
          auto lock = strongThis->updatesRegistryManager_->lock();
          callback(timestamp);
        }
      });
    };
  }

  auto updateProps = [weakThis = weak_from_this()](jsi::Runtime &rt, const jsi::Value &operations) {
    auto strongThis = weakThis.lock();
    if (!strongThis) {
      return;
    }

    const auto timestamp = strongThis->getAnimationTimestamp_();
    auto lock = strongThis->updatesRegistryManager_->lock();
    strongThis->animatedPropsRegistry_->update(rt, operations, timestamp);
  };

  auto measure = [weakThis = weak_from_this()](jsi::Runtime &rt, const jsi::Value &shadowNodeValue) -> jsi::Value {
    auto strongThis = weakThis.lock();
    if (!strongThis) {
      return jsi::Value::undefined();
    }
    return strongThis->measure(rt, shadowNodeValue);
  };

  auto dispatchCommand = [weakThis = weak_from_this()](
                             jsi::Runtime &rt,
                             const jsi::Value &shadowNodeValue,
                             const jsi::Value &commandNameValue,
                             const jsi::Value &argsValue) {
    auto strongThis = weakThis.lock();
    if (!strongThis) {
      return;
    }

    strongThis->dispatchCommand(rt, shadowNodeValue, commandNameValue, argsValue);
  };

  ProgressLayoutAnimationFunction progressLayoutAnimation =
      [weakThis = weak_from_this()](jsi::Runtime &rt, int tag, const jsi::Object &newStyle) {
        // Always on UI thread.
        auto strongThis = weakThis.lock();
        if (!strongThis) {
          return;
        }
        auto surfaceId = strongThis->layoutAnimationsProxy_->progressLayoutAnimation(tag, newStyle);
        if (!surfaceId) {
          return;
        }
        // The flush set is drained by `executeLayoutAnimationsRequests`, driven
        // by `runGrandCallback` (backend) or a JS `requestAnimationFrameFinalizer` (non-backend).
        strongThis->layoutAnimationFlushRequests_.insert(*surfaceId);
      };

  EndLayoutAnimationFunction endLayoutAnimation = [weakThis = weak_from_this()](int tag, bool shouldRemove) {
    // Always on UI thread.
    auto strongThis = weakThis.lock();
    if (!strongThis) {
      return;
    }

    auto surfaceId = strongThis->layoutAnimationsProxy_->endLayoutAnimation(tag, shouldRemove);
    if (!surfaceId) {
      return;
    }
    strongThis->layoutAnimationFlushRequests_.insert(*surfaceId);
  };

  auto obtainProp = [weakThis = weak_from_this()](
                        jsi::Runtime &rt, const jsi::Value &shadowNodeWrapper, const jsi::Value &propName) {
    auto strongThis = weakThis.lock();
    if (!strongThis) {
      return jsi::String::createFromUtf8(rt, "");
    }

    return strongThis->obtainProp(rt, shadowNodeWrapper, propName);
  };

  std::optional<worklets::RequestAnimationFrameHostFunction> requestAnimationFrame;
  if constexpr (StaticFeatureFlags::getFlag("USE_ANIMATION_BACKEND")) {
    requestAnimationFrame = [weakThis = weak_from_this()](jsi::Runtime &rt, const jsi::Value &callback) {
      auto strongThis = weakThis.lock();
      if (!strongThis) {
        return;
      }

      auto callbackFunction = std::make_shared<jsi::Function>(callback.asObject(rt).asFunction(rt));
      strongThis->pendingAnimationFrameCallbackFromWorklets_ =
          [callbackFunction = std::move(callbackFunction),
           weakRuntime = getWeakRuntimeFromJSIRuntime(rt)](double timestamp) {
            auto runtime = weakRuntime.lock();
            if (!runtime) {
              return;
            }

            runSyncOnRuntime(runtime, *callbackFunction, jsi::Value(timestamp));
          };
      strongThis->startBackendIfNeeded();
    };
  }

  jsi::Runtime &uiRuntime = getJSIRuntimeFromWorkletRuntime(uiRuntime_);
  UIRuntimeDecorator::decorate(
      uiRuntime,
      obtainProp,
      updateProps,
      measure,
      dispatchCommand,
      platformDepMethodsHolder.getAnimationTimestamp,
      platformDepMethodsHolder.setGestureStateFunction,
      progressLayoutAnimation,
      endLayoutAnimation,
      platformDepMethodsHolder.maybeFlushUIUpdatesQueueFunction,
      requestAnimationFrame);
}

ReanimatedModuleProxy::~ReanimatedModuleProxy() {
  // event handler registry and frame callbacks store some JSI values from UI
  // runtime, so they have to go away before we tear down the runtime
  eventHandlerRegistry_.reset();
}

jsi::Value ReanimatedModuleProxy::registerEventHandler(
    jsi::Runtime &rt,
    const jsi::Value &worklet,
    const jsi::Value &eventName,
    const jsi::Value &emitterReactTag) {
  static uint64_t NEXT_EVENT_HANDLER_ID = 1;

  uint64_t newRegistrationId = NEXT_EVENT_HANDLER_ID++;
  auto eventNameStr = eventName.asString(rt).utf8(rt);
  auto handlerSerializable = extractSerializable(
      rt, worklet, "[Reanimated] Event handler must be a serializable worklet.", Serializable::ValueType::WorkletType);
  int emitterReactTagInt = emitterReactTag.asNumber();

  scheduleOnUI(uiScheduler_, [=, weakThis = weak_from_this()]() {
    auto strongThis = weakThis.lock();
    if (!strongThis) {
      return;
    }
    auto handler =
        std::make_shared<UIEventHandler>(newRegistrationId, eventNameStr, emitterReactTagInt, handlerSerializable);
    strongThis->eventHandlerRegistry_->registerEventHandler(handler);
  });

  return jsi::Value(static_cast<double>(newRegistrationId));
}

void ReanimatedModuleProxy::unregisterEventHandler(jsi::Runtime &, const jsi::Value &registrationId) {
  uint64_t id = registrationId.asNumber();
  scheduleOnUI(uiScheduler_, [=, weakThis = weak_from_this()]() {
    auto strongThis = weakThis.lock();
    if (!strongThis) {
      return;
    }
    strongThis->eventHandlerRegistry_->unregisterEventHandler(id);
  });
}

std::string ReanimatedModuleProxy::obtainPropFromShadowNode(
    jsi::Runtime &rt,
    const std::string &propName,
    const std::shared_ptr<const ShadowNode> &shadowNode) {
  auto newestCloneOfShadowNode = uiManager_->getNewestCloneOfShadowNode(*shadowNode);

  return PropValueProcessor::processPropValue(propName, newestCloneOfShadowNode, rt);
}

jsi::Value ReanimatedModuleProxy::getViewProp(
    jsi::Runtime &rnRuntime,
    const jsi::Value &shadowNodeWrapper,
    const jsi::Value &propName,
    const jsi::Value &callback) {
  const auto propNameStr = propName.asString(rnRuntime).utf8(rnRuntime);
  const auto funPtr = std::make_shared<jsi::Function>(callback.getObject(rnRuntime).asFunction(rnRuntime));
  const auto shadowNode = shadowNodeFromValue(rnRuntime, shadowNodeWrapper);
  scheduleOnUI(uiScheduler_, [=, weakThis = weak_from_this()]() {
    auto strongThis = weakThis.lock();
    if (!strongThis) {
      return;
    }
    jsi::Runtime &uiRuntime = getJSIRuntimeFromWorkletRuntime(strongThis->uiRuntime_);
    const auto resultStr = strongThis->obtainPropFromShadowNode(uiRuntime, propNameStr, shadowNode);

    strongThis->jsInvoker_->invokeAsync([=](jsi::Runtime &rnRuntime) {
      const auto resultValue = jsi::String::createFromUtf8(rnRuntime, resultStr);
      funPtr->call(rnRuntime, resultValue);
    });
  });
  return jsi::Value::undefined();
}

jsi::Value ReanimatedModuleProxy::getStaticFeatureFlag(jsi::Runtime &rt, const jsi::Value &name) {
  return reanimated::StaticFeatureFlags::getFlag(name.asString(rt).utf8(rt));
}

jsi::Value
ReanimatedModuleProxy::setDynamicFeatureFlag(jsi::Runtime &rt, const jsi::Value &name, const jsi::Value &value) {
  reanimated::DynamicFeatureFlags::setFlag(name.asString(rt).utf8(rt), value.asBool());
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
    batchItem.type = static_cast<LayoutAnimationType>(item.getProperty(rt, "type").asNumber());
    auto config = item.getProperty(rt, "config");
    if (config.isUndefined()) {
      batchItem.config = nullptr;
    } else {
      batchItem.config = extractSerializable(
          rt, config, "[Reanimated] Layout animation config must be an object.", Serializable::ValueType::ObjectType);
    }
    auto sharedTag = item.getProperty(rt, "sharedTransitionTag");
    if (!sharedTag.isUndefined()) {
      batchItem.sharedTransitionTag = sharedTag.asString(rt).utf8(rt);
    }
  }
  layoutAnimationsManager_->configureAnimationBatch(batch);
  return jsi::Value::undefined();
}

void ReanimatedModuleProxy::setShouldAnimateExiting(
    jsi::Runtime &rt,
    const jsi::Value &viewTag,
    const jsi::Value &shouldAnimate) {
  layoutAnimationsManager_->setShouldAnimateExiting(viewTag.asNumber(), shouldAnimate.getBool());
}

bool ReanimatedModuleProxy::isAnyHandlerWaitingForEvent(const std::string &eventName, const int emitterReactTag) {
  return eventHandlerRegistry_->isAnyHandlerWaitingForEvent(eventName, emitterReactTag);
}

jsi::Value ReanimatedModuleProxy::registerSensor(
    jsi::Runtime &rt,
    const jsi::Value &sensorType,
    const jsi::Value &interval,
    const jsi::Value &iosReferenceFrame,
    const jsi::Value &sensorDataHandler) {
  return animatedSensorModule_.registerSensor(
      rt, uiRuntime_, sensorType, interval, iosReferenceFrame, sensorDataHandler);
}

void ReanimatedModuleProxy::unregisterSensor(jsi::Runtime &, const jsi::Value &sensorId) {
  animatedSensorModule_.unregisterSensor(sensorId);
}

void ReanimatedModuleProxy::cleanupSensors() {
  animatedSensorModule_.unregisterAllSensors();
}

void ReanimatedModuleProxy::setViewStyle(jsi::Runtime &rt, const jsi::Value &viewTag, const jsi::Value &viewStyle) {
  auto lock = updatesRegistryManager_->lock();
  staticPropsRegistry_->set(rt, viewTag.asNumber(), viewStyle);
}

void ReanimatedModuleProxy::markNodeAsRemovable(jsi::Runtime &rt, const jsi::Value &shadowNodeWrapper) {
  auto shadowNode = shadowNodeFromValue(rt, shadowNodeWrapper);
  auto lock = updatesRegistryManager_->lock();
  updatesRegistryManager_->markNodeAsRemovable(shadowNode);
}

void ReanimatedModuleProxy::unmarkNodeAsRemovable(jsi::Runtime &rt, const jsi::Value &viewTag) {
  auto lock = updatesRegistryManager_->lock();
  updatesRegistryManager_->unmarkNodeAsRemovable(viewTag.asNumber());
}

void ReanimatedModuleProxy::registerCSSKeyframes(
    jsi::Runtime &rt,
    const jsi::Value &animationName,
    const jsi::Value &compoundComponentName,
    const jsi::Value &keyframesConfig) {
  const auto compoundComponentNameStr = compoundComponentName.asString(rt).utf8(rt);
  auto parsedConfig =
      parseCSSAnimationKeyframesConfig(rt, keyframesConfig, compoundComponentNameStr, viewStylesRepository_);

  auto lock = updatesRegistryManager_->lock();
  cssAnimationKeyframesRegistry_->set(
      animationName.asString(rt).utf8(rt), compoundComponentNameStr, std::move(parsedConfig));
}

void ReanimatedModuleProxy::unregisterCSSKeyframes(
    jsi::Runtime &rt,
    const jsi::Value &animationName,
    const jsi::Value &compoundComponentName) {
  auto lock = updatesRegistryManager_->lock();
  cssAnimationKeyframesRegistry_->remove(
      animationName.asString(rt).utf8(rt), compoundComponentName.asString(rt).utf8(rt));
}

void ReanimatedModuleProxy::applyCSSAnimations(
    jsi::Runtime &rt,
    const jsi::Value &shadowNodeWrapper,
    const jsi::Value &compoundComponentName,
    const jsi::Value &animationUpdates) {
  auto shadowNode = shadowNodeFromValue(rt, shadowNodeWrapper);
  const auto compoundComponentNameStr = compoundComponentName.asString(rt).utf8(rt);
  const auto updates = parseCSSAnimationUpdates(rt, animationUpdates);

  auto lock = updatesRegistryManager_->lock();
  cssAnimationsRegistry_->apply(shadowNode, compoundComponentNameStr, updates);
}

void ReanimatedModuleProxy::unregisterCSSAnimations(const jsi::Value &viewTag) {
  auto lock = updatesRegistryManager_->lock();
  cssAnimationsRegistry_->remove(viewTag.asNumber());
}

void ReanimatedModuleProxy::runCSSTransition(
    jsi::Runtime &rt,
    const jsi::Value &shadowNodeWrapper,
    const jsi::Value &transitionConfig) {
  auto shadowNode = shadowNodeFromValue(rt, shadowNodeWrapper);
  auto config = parseCSSTransitionConfig(rt, shadowNode->getComponentName(), transitionConfig);

  auto lock = updatesRegistryManager_->lock();
  cssTransitionsRegistry_->updateConfigOrRun(rt, shadowNode, std::move(config));
}

void ReanimatedModuleProxy::unregisterCSSTransition(jsi::Runtime &rt, const jsi::Value &viewTag) {
  auto lock = updatesRegistryManager_->lock();
  cssTransitionsRegistry_->remove(viewTag.asNumber());
}

void ReanimatedModuleProxy::registerPseudoStyle(
    jsi::Runtime &rt,
    const jsi::Value &shadowNodeWrapper,
    const jsi::Value &config) {
  const auto shadowNode = shadowNodeFromValue(rt, shadowNodeWrapper);
  const auto tag = shadowNode->getTag();
  const auto configObj = config.asObject(rt);

  const auto selectorStr = stringFromValue(rt, configObj.getProperty(rt, "selector"));
  const auto selectorEnum = pseudoSelectorFromString(selectorStr);
  if (!selectorEnum) {
    return;
  }

  auto transitionConfig =
      css::parseCSSTransitionConfig(rt, shadowNode->getComponentName(), configObj.getProperty(rt, "transition"));

  // TODO - clean up pseudo selectors registration not to have to clear the changedProperties object
  transitionConfig.changedProperties.clear();

  auto lock = updatesRegistryManager_->lock();
  cssTransitionsRegistry_->updateConfigOrRun(rt, shadowNode, std::move(transitionConfig));
  pseudoStylesRegistry_->registerPseudoStyle(
      tag,
      shadowNode,
      *selectorEnum,
      jsi::dynamicFromValue(rt, configObj.getProperty(rt, "selectorStyle")),
      jsi::dynamicFromValue(rt, configObj.getProperty(rt, "defaultStyle")));
}

void ReanimatedModuleProxy::unregisterPseudoStyle(jsi::Runtime &, const jsi::Value &viewTag) {
  auto lock = updatesRegistryManager_->lock();
  pseudoStylesRegistry_->remove(viewTag.asNumber());
}

jsi::Value ReanimatedModuleProxy::getSettledUpdates(jsi::Runtime &rt) {
  react_native_assert(
      StaticFeatureFlags::getFlag("FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS") &&
      "getSettledUpdates requires FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS static feature flag to be enabled");

  // TODO(future): use unified timestamp
  const auto currentTimestamp = getAnimationTimestamp_();

  // TODO: fix bug when threshold difference is smaller than 1 second
  // TODO(future): flush updates from CSS animations and CSS transitions registries
  // TODO(future): find a better way to obtain timestamp for removing updates
  // TODO(future): move removing old updates to separate method
  auto lock = updatesRegistryManager_->lock();
  return animatedPropsRegistry_->getUpdatesOlderThanTimestamp(
      rt, currentTimestamp - 1000 /* 1 second */, currentTimestamp - 2000 /* 2 seconds */);
}

bool ReanimatedModuleProxy::handleEvent(
    const std::string &eventName,
    const int emitterReactTag,
    const jsi::Value &payload,
    double currentTime) {
  ReanimatedSystraceSection s("ReanimatedModuleProxy::handleEvent");

  eventHandlerRegistry_->processEvent(uiRuntime_, currentTime, eventName, emitterReactTag, payload);

  // TODO: return true if Reanimated successfully handled the event
  // to avoid sending it to JavaScript
  return false;
}

bool ReanimatedModuleProxy::handleRawEvent(const RawEvent &rawEvent, double currentTime) {
  ReanimatedSystraceSection s("ReanimatedModuleProxy::handleRawEvent");

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

  if constexpr (StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
    if (eventType == "onTransitionProgress") {
      jsi::Runtime &uiRuntime = getJSIRuntimeFromWorkletRuntime(uiRuntime_);
      const auto &eventPayload = rawEvent.eventPayload;
      jsi::Object payload = eventPayload->asJSIValue(uiRuntime).asObject(uiRuntime);
      auto progress = payload.getProperty(uiRuntime, "progress").asNumber();
      auto closing = static_cast<bool>(payload.getProperty(uiRuntime, "closing").asNumber());
      auto goingForward = static_cast<bool>(payload.getProperty(uiRuntime, "goingForward").asNumber());

      if (!layoutAnimationsProxy_) {
        return false;
      }
      auto surfaceId = layoutAnimationsProxy_->onTransitionProgress(tag, progress, closing, goingForward);
      if (!surfaceId) {
        return false;
      }
      // TODO (future): enumerate -> visit
      uiManager_->getShadowTreeRegistry().enumerate(
          [](const ShadowTree &shadowTree, bool &) { shadowTree.notifyDelegatesOfUpdates(); });
      return false;
    } else if (eventType == "onGestureCancel") {
      if (!layoutAnimationsProxy_) {
        return false;
      }
      auto surfaceId = layoutAnimationsProxy_->onGestureCancel();
      if (!surfaceId) {
        return false;
      }
      // TODO (future): enumerate -> visit
      uiManager_->getShadowTreeRegistry().enumerate(
          [](const ShadowTree &shadowTree, bool &) { shadowTree.notifyDelegatesOfUpdates(); });
      return false;
    }
  }

  if (!isAnyHandlerWaitingForEvent(eventType, tag)) {
    return false;
  }

  jsi::Runtime &uiRuntime = getJSIRuntimeFromWorkletRuntime(uiRuntime_);
  const auto &eventPayload = rawEvent.eventPayload;
  jsi::Value payload = eventPayload->asJSIValue(uiRuntime);

  if constexpr (StaticFeatureFlags::getFlag("USE_ANIMATION_BACKEND")) {
    return handleEventAndFlush(eventType, tag, payload, GrandCallbackSource::Event);
  }

  auto res = handleEvent(eventType, tag, payload, currentTime);
  // TODO: we should call performOperations conditionally if event is handled
  // (res == true), but for now handleEvent always returns false. Thankfully,
  // performOperations does not trigger a lot of code if there is nothing to
  // be done so this is fine for now.
  performOperations();
  return res;
}

void ReanimatedModuleProxy::executeLayoutAnimationsRequests() {
  std::set<SurfaceId> flushRequestsCopy = std::move(layoutAnimationFlushRequests_);
  for (const auto surfaceId : flushRequestsCopy) {
    uiManager_->getShadowTreeRegistry().visit(
        surfaceId, [](const ShadowTree &shadowTree) { shadowTree.notifyDelegatesOfUpdates(); });
  }
}

void ReanimatedModuleProxy::performOperations() {
  if constexpr (StaticFeatureFlags::getFlag("USE_ANIMATION_BACKEND")) {
    react_native_assert(
        false && "[Reanimated] performOperations must not be called when USE_ANIMATION_BACKEND is enabled");
    return;
  }

  ReanimatedSystraceSection s("ReanimatedModuleProxy::performOperations");

  executeLayoutAnimationsRequests();

  jsi::Runtime &uiRuntime = getJSIRuntimeFromWorkletRuntime(uiRuntime_);

  UpdatesBatch updatesBatch;
  {
    ReanimatedSystraceSection s2("ReanimatedModuleProxy::flushUpdates");

    auto lock = updatesRegistryManager_->lock();

    if (cssTransitionsRegistry_->needsFlush()) {
      // Update CSS transitions and flush updates
      cssTransitionsRegistry_->flushUpdates(updatesBatch);
    }

    // Flush all animated props updates
    animatedPropsRegistry_->flushUpdates(updatesBatch);

    if (cssAnimationsRegistry_->needsFlush()) {
      // Update CSS animations and flush updates
      cssAnimationsRegistry_->flushUpdates(updatesBatch);
    }
  }

  if constexpr (shouldUseSynchronousUpdatesInPerformOperations()) {
    applySynchronousUpdates(updatesBatch, false);
  }

  if (updatesRegistryManager_->shouldReanimatedSkipCommit()) {
    // It may happen that `performOperations` is called on the UI thread
    // while React Native tries to commit a new tree on the JS thread.
    // In this case, we should skip the commit here and let React Native do
    // it. The commit will include the current values from the updates manager
    // which will be applied in ReanimatedCommitHook.
    if (!updatesBatch.empty()) {
      updatesRegistryManager_->pleaseCommitAfterPause();
    }
    return;
  }

  commitUpdates(uiRuntime, updatesBatch);

  // Clear the entire cache after the commit
  // (we don't know if the view is updated from outside of Reanimated
  // so we have to clear the entire cache)
  viewStylesRepository_->clearNodesCache();
}

void ReanimatedModuleProxy::performNonLayoutOperations() {
  ReanimatedSystraceSection s("ReanimatedModuleProxy::performNonLayoutOperations");

  UpdatesBatch updatesBatch;
  {
    auto lock = updatesRegistryManager_->lock();
    updatesBatch = animatedPropsRegistry_->getPendingUpdates();
  }
  applySynchronousUpdates(updatesBatch, true);
}

#if REACT_NATIVE_VERSION_MINOR >= 85
AnimationMutations ReanimatedModuleProxy::collectNonLayoutAnimationUpdates() {
  ReanimatedSystraceSection s("ReanimatedModuleProxy::collectNonLayoutAnimationUpdates");

  AnimationMutations mutations;
  jsi::Runtime &uiRuntime = getJSIRuntimeFromWorkletRuntime(uiRuntime_);
  {
    auto lock = updatesRegistryManager_->lock();
    animatedPropsRegistry_->flushNonLayoutUpdates(uiRuntime, mutations);
  }
  return mutations;
}

std::shared_ptr<UIManagerAnimationBackend> ReanimatedModuleProxy::getAnimationBackend() {
  react_native_assert(
      uiManager_ != nullptr && "[Reanimated] Animation Backend used before the uiManager was registered");
  auto locked = uiManager_->unstable_getAnimationBackend().lock();
  // UIManager owns the backend, so this is just a sanity check.
  react_native_assert(
      locked != nullptr &&
      "[Reanimated] Animation Backend is null (UIManager not wired to a backend yet or already torn down)");
  return locked;
}
#endif

void ReanimatedModuleProxy::startBackendIfNeeded() {
#if REACT_NATIVE_VERSION_MINOR >= 85
  if constexpr (StaticFeatureFlags::getFlag("USE_ANIMATION_BACKEND")) {
    if (isAnimationRunning_) {
      return;
    }
    animationBackendCallbackId_ =
        getAnimationBackend()->start([weakThis = weak_from_this()](AnimationTimestamp timestamp) {
          auto strongThis = weakThis.lock();
          if (!strongThis) {
            return AnimationMutations{};
          }
          return strongThis->runGrandCallback(timestamp, GrandCallbackSource::AnimationLoop);
        });
    isAnimationRunning_ = true;
  }
#endif
}

void ReanimatedModuleProxy::stopBackendIfIdle(const bool producedMutations) {
#if REACT_NATIVE_VERSION_MINOR >= 85
  if constexpr (StaticFeatureFlags::getFlag("USE_ANIMATION_BACKEND")) {
    const bool hasWork = producedMutations || !pendingFrameCallbacks_.empty() ||
        pendingAnimationFrameCallbackFromWorklets_ != nullptr || operationsLoop_->hasOngoingOperations() ||
        animatedPropsRegistry_->hasPendingAnimatedPropsUpdates() || shouldFlushRegistry_ ||
        !layoutAnimationFlushRequests_.empty();
    if (!hasWork) {
      getAnimationBackend()->stop(animationBackendCallbackId_);
      isAnimationRunning_ = false;
    }
  }
#endif
}

#if REACT_NATIVE_VERSION_MINOR >= 85
AnimationMutations ReanimatedModuleProxy::mutationsFromAnimatedPropsBatch(
    UpdatesBatchAnimatedProps &&animatedPropsBatch) {
  // This is a temporary fix, in reanimated we can sometimes produce multiple updates for the same view
  // In that case Animation Backend will only apply the last one.
  // Until the fix is implemented there, we will keep the merging logic here.
  AnimationMutations mutations;
  mutations.batch.reserve(animatedPropsBatch.size());
  std::unordered_map<Tag, size_t> mutationIndexByTag;
  for (auto &[shadowNodeFamily, animatedProps, hasLayoutUpdates] : animatedPropsBatch) {
    const auto tag = shadowNodeFamily->getTag();

    const auto it = mutationIndexByTag.find(tag);
    if (it == mutationIndexByTag.end()) {
      mutationIndexByTag.emplace(tag, mutations.batch.size());
      mutations.batch.push_back(AnimationMutation{tag, shadowNodeFamily, std::move(animatedProps), hasLayoutUpdates});
    } else {
      auto &mutation = mutations.batch[it->second];
      mutation.hasLayoutUpdates |= hasLayoutUpdates;
      mergeAnimatedProps(mutation.props, std::move(animatedProps));
    }
  }
  return mutations;
}

AnimationMutations ReanimatedModuleProxy::runGrandCallback(
    const AnimationTimestamp timestamp,
    const GrandCallbackSource source) {
  ReanimatedSystraceSection s("ReanimatedModuleProxy::runGrandCallback");

  switch (source) {
    case GrandCallbackSource::AnimationLoop: {
      // Worklet callbacks and layout animation flushes run outside the manager
      // lock: they touch only UI-thread state and may re-enter the proxy (via
      // requestAnimationFrame or the commit hook).
      executeWorkletsForFrame(timestamp);
      executeLayoutAnimationsRequests();

      AnimationMutations mutations;
      {
        auto lock = updatesRegistryManager_->lock();
        executeOperationsLoop(timestamp);
        mutations = executeOperationsAndCollectUpdates(timestamp);
        stopBackendIfIdle(!mutations.batch.empty());
      }
      return mutations;
    }

    case GrandCallbackSource::Event: {
      executeLayoutAnimationsRequests();
      return collectEventUpdates();
    }

    case GrandCallbackSource::EventInAndroidDraw:
      return collectNonLayoutAnimationUpdates();
  }

  return AnimationMutations{};
}

void ReanimatedModuleProxy::executeOperationsLoop(const AnimationTimestamp timestamp) {
  ReanimatedSystraceSection s("ReanimatedModuleProxy::executeOperationsLoop");

  auto pendingFrameCallbacks = std::exchange(pendingFrameCallbacks_, {});
  for (auto &cb : pendingFrameCallbacks) {
    cb(timestamp.count());
  }
}

void ReanimatedModuleProxy::executeWorkletsForFrame(const AnimationTimestamp timestamp) {
  if (!pendingAnimationFrameCallbackFromWorklets_) {
    return;
  }
  auto cb = std::exchange(pendingAnimationFrameCallbackFromWorklets_, nullptr);
  cb(timestamp.count());
}

AnimationMutations ReanimatedModuleProxy::executeOperationsAndCollectUpdates(const AnimationTimestamp timestamp) {
  ReanimatedSystraceSection s("ReanimatedModuleProxy::executeOperationsAndCollectUpdates");

  UpdatesBatchAnimatedProps batch;

  (void)timestamp;
  cssTransitionsRegistry_->flushUpdates(batch);
  animatedPropsRegistry_->flushUpdates(batch);
  cssAnimationsRegistry_->flushUpdates(batch);

  return mutationsFromAnimatedPropsBatch(std::move(batch));
}

AnimationMutations ReanimatedModuleProxy::collectEventUpdates() {
  ReanimatedSystraceSection s("ReanimatedModuleProxy::collectEventUpdates");

  UpdatesBatchAnimatedProps batch;
  auto lock = updatesRegistryManager_->lock();
  animatedPropsRegistry_->flushUpdates(batch);

  return mutationsFromAnimatedPropsBatch(std::move(batch));
}
#endif

bool ReanimatedModuleProxy::handleEventAndFlush(
    const std::string &eventName,
    const int emitterReactTag,
    const jsi::Value &payload,
    const GrandCallbackSource source) {
  bool handled = false;
#if REACT_NATIVE_VERSION_MINOR >= 85 && (REACT_NATIVE_VERSION_MINOR > 85 || REACT_NATIVE_VERSION_PATCH >= 2)
  getAnimationBackend()->pushAnimationMutations([&, source](AnimationTimestamp timestamp) {
    handled = handleEvent(eventName, emitterReactTag, payload, timestamp.count());
    return runGrandCallback(timestamp, source);
  });
#else
  (void)eventName;
  (void)emitterReactTag;
  (void)payload;
  (void)source;
#endif
  return handled;
}

void ReanimatedModuleProxy::applySynchronousUpdates(UpdatesBatch &updatesBatch, const bool allowPartialUpdates) {
  auto [synchronousUpdatesBatch, shadowTreeUpdatesBatch] = partitionUpdates(updatesBatch, allowPartialUpdates);

#ifdef ANDROID
  if (!synchronousUpdatesBatch.empty()) {
    serializeSynchronousPropsToBuffers(
        synchronousUpdatesBatch, synchronousPropsIntBuffer_, synchronousPropsDoubleBuffer_);
    synchronouslyUpdateUIPropsFunction_(synchronousPropsIntBuffer_, synchronousPropsDoubleBuffer_);
  }
#endif // ANDROID

#if __APPLE__
  for (const auto &[shadowNodeFamily, props] : synchronousUpdatesBatch) {
    synchronouslyUpdateUIPropsFunction_(shadowNodeFamily->getTag(), props);
  }
#endif // __APPLE__

  updatesBatch = std::move(shadowTreeUpdatesBatch);
}

void ReanimatedModuleProxy::requestFlushRegistry() {
  if constexpr (StaticFeatureFlags::getFlag("USE_ANIMATION_BACKEND")) {
    shouldFlushRegistry_ = true;
    startBackendIfNeeded();
  } else {
    requestRender_([weakThis = weak_from_this()](const double) {
      if (auto strongThis = weakThis.lock()) {
        strongThis->shouldFlushRegistry_ = true;
      }
    });
  }
}

void ReanimatedModuleProxy::commitUpdates(jsi::Runtime &rt, const UpdatesBatch &updatesBatch) {
  ReanimatedSystraceSection s("ReanimatedModuleProxy::commitUpdates");
  react_native_assert(uiManager_ != nullptr);
  const auto &shadowTreeRegistry = uiManager_->getShadowTreeRegistry();

  std::unordered_map<SurfaceId, PropsMap> propsMapBySurface;
  PropsMap collectedProps;
  bool flushRegistry;

  // Release the lock before shadowTree.commit - it re-enters via ReanimatedCommitHook.
  {
    auto lock = updatesRegistryManager_->lock();
#ifdef ANDROID
    updatesRegistryManager_->collectPropsToRevertBySurface(propsMapBySurface);
#endif
    flushRegistry = shouldFlushRegistry_.exchange(false);
    if (flushRegistry) {
      collectedProps = updatesRegistryManager_->collectProps();
    }
  }

  if (flushRegistry) {
    for (auto const &[family, props] : collectedProps) {
      auto &propsVector = propsMapBySurface[family->getSurfaceId()][family];
      for (const auto &prop : props) {
        propsVector.emplace_back(prop);
      }
    }
  } else {
    for (auto const &[shadowNodeFamily, props] : updatesBatch) {
      propsMapBySurface[shadowNodeFamily->getSurfaceId()][shadowNodeFamily].emplace_back(props);
    }
  }

  for (auto const &[surfaceId, propsMap] : propsMapBySurface) {
    shadowTreeRegistry.visit(surfaceId, [&](ShadowTree const &shadowTree) {
      const auto status = shadowTree.commit(
          [&](RootShadowNode const &oldRootShadowNode) -> RootShadowNode::Unshared {
            if (updatesRegistryManager_->shouldReanimatedSkipCommit()) {
              return nullptr;
            }

            auto rootNode = cloneShadowTreeWithNewProps(oldRootShadowNode, propsMap);

            // Mark the commit as Reanimated commit so that we can distinguish
            // it in ReanimatedCommitHook.

            auto reaShadowNode = std::reinterpret_pointer_cast<ReanimatedCommitShadowNode>(rootNode);
            reaShadowNode->setReanimatedCommitTrait();

            return rootNode;
          },
          {/* .enableStateReconciliation = */
           false,
           /* .mountSynchronously = */ true});

#ifdef ANDROID
      if (status == ShadowTree::CommitStatus::Succeeded) {
        auto lock = updatesRegistryManager_->lock();
        updatesRegistryManager_->clearPropsToRevert(surfaceId);
      }
#else
      (void)status;
#endif
    });
  }
}

void ReanimatedModuleProxy::dispatchCommand(
    jsi::Runtime &rt,
    const jsi::Value &shadowNodeValue,
    const jsi::Value &commandNameValue,
    const jsi::Value &argsValue) {
  const auto shadowNode = shadowNodeFromValue(rt, shadowNodeValue);
  std::string commandName = stringFromValue(rt, commandNameValue);
  folly::dynamic args = commandArgsFromValue(rt, argsValue);
  const auto &scheduler = static_cast<Scheduler *>(uiManager_->getDelegate());

  if (!scheduler) {
    return;
  }

  const auto &schedulerDelegate = scheduler->getDelegate();

  if (schedulerDelegate) {
    const auto shadowView = ShadowView(*shadowNode);
    schedulerDelegate->schedulerDidDispatchCommand(shadowView, commandName, args);
  }
}

jsi::String
ReanimatedModuleProxy::obtainProp(jsi::Runtime &rt, const jsi::Value &shadowNodeWrapper, const jsi::Value &propName) {
  jsi::Runtime &uiRuntime = getJSIRuntimeFromWorkletRuntime(uiRuntime_);
  const auto propNameStr = propName.asString(rt).utf8(rt);
  const auto shadowNode = shadowNodeFromValue(rt, shadowNodeWrapper);
  const auto resultStr = obtainPropFromShadowNode(uiRuntime, propNameStr, shadowNode);
  return jsi::String::createFromUtf8(rt, resultStr);
}

jsi::Value ReanimatedModuleProxy::measure(jsi::Runtime &rt, const jsi::Value &shadowNodeValue) {
  // based on implementation from UIManagerBinding.cpp

  auto shadowNode = shadowNodeFromValue(rt, shadowNodeValue);
  auto layoutMetrics = uiManager_->getRelativeLayoutMetrics(*shadowNode, nullptr, {/* .includeTransform = */ true});

  if (layoutMetrics == EmptyLayoutMetrics) {
    // Originally, in this case React Native returns `{0, 0, 0, 0, 0, 0}`,
    // most likely due to the type of measure callback function which accepts
    // just an array of numbers (not null). In Reanimated, `measure` returns
    // `MeasuredDimensions | null`.
    return jsi::Value::null();
  }
  auto newestCloneOfShadowNode = uiManager_->getNewestCloneOfShadowNode(*shadowNode);

  auto layoutableShadowNode = dynamic_cast<LayoutableShadowNode const *>(newestCloneOfShadowNode.get());
  facebook::react::Point originRelativeToParent = layoutableShadowNode != nullptr
      ? layoutableShadowNode->getLayoutMetrics().frame.origin
      : facebook::react::Point();

  auto frame = layoutMetrics.frame;

  jsi::Object result(rt);
  result.setProperty(rt, "x", jsi::Value(static_cast<double>(originRelativeToParent.x)));
  result.setProperty(rt, "y", jsi::Value(static_cast<double>(originRelativeToParent.y)));
  result.setProperty(rt, "width", jsi::Value(static_cast<double>(frame.size.width)));
  result.setProperty(rt, "height", jsi::Value(static_cast<double>(frame.size.height)));
  result.setProperty(rt, "pageX", jsi::Value(static_cast<double>(frame.origin.x)));
  result.setProperty(rt, "pageY", jsi::Value(static_cast<double>(frame.origin.y)));
  return result;
}

void ReanimatedModuleProxy::initializeFabric(const std::shared_ptr<UIManager> &uiManager) {
  uiManager_ = uiManager;
  viewStylesRepository_->setUIManager(uiManager_);

  if constexpr (StaticFeatureFlags::getFlag("USE_ANIMATION_BACKEND")) {
    react_native_assert(
        (REACT_NATIVE_VERSION_MINOR > 85 || (REACT_NATIVE_VERSION_MINOR == 85 && REACT_NATIVE_VERSION_PATCH >= 2)) &&
        "[Reanimated] USE_ANIMATION_BACKEND requires React Native 0.85.2 or newer.");

#if REACT_NATIVE_VERSION_MINOR >= 85
    if (!ReactNativeFeatureFlags::useSharedAnimatedBackend()) {
      react_native_assert(
          false &&
          "[Reanimated] USE_ANIMATION_BACKEND flag is enabled, "
          "but ReactNativeFeatureFlags::useSharedAnimatedBackend is disabled. "
          "Enable the Experimental Release level in React Native, "
          "or disable the Reanimated Feature Flag");
    }
#endif
  }

  initializeLayoutAnimationsProxy();

  const std::function<void()> request = [weakThis = weak_from_this()]() {
    auto strongThis = weakThis.lock();
    if (!strongThis) {
      return;
    }

    strongThis->requestFlushRegistry();
  };

  if constexpr (StaticFeatureFlags::getFlag("USE_ANIMATION_BACKEND")) {
    // TODO: we don't use the mount hook here, but we still need a way to handleNodeRemovals
    // for now we leave this to leak the memory, a fix will come in a follow-up
  } else {
    mountHook_ = std::make_shared<ReanimatedMountHook>(uiManager_, updatesRegistryManager_, request);
  }

  commitHook_ = std::make_shared<ReanimatedCommitHook>(uiManager_, updatesRegistryManager_, layoutAnimationsProxy_);
}

void ReanimatedModuleProxy::initializeLayoutAnimationsProxy() {
  auto scheduler = reinterpret_cast<Scheduler *>(uiManager_->getDelegate());
  auto componentDescriptorRegistry =
      scheduler->getContextContainer()
          ->at<std::weak_ptr<const ComponentDescriptorRegistry>>("ComponentDescriptorRegistry_DO_NOT_USE_PRETTY_PLEASE")
          .lock();

  if (componentDescriptorRegistry) {
    if constexpr (StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
      auto layoutAnimationsProxyExperimental = std::make_shared<LayoutAnimationsProxy_Experimental>(
          layoutAnimationsManager_,
          componentDescriptorRegistry,
          scheduler->getContextContainer(),
          getJSIRuntimeFromWorkletRuntime(uiRuntime_),
          uiScheduler_
#ifdef ANDROID
          ,
          filterUnmountedTagsFunction_,
          uiManager_,
          jsInvoker_
#endif
      );
#ifdef __APPLE__
      layoutAnimationsProxyExperimental->setForceScreenSnapshotFunction(forceScreenSnapshot_);
#endif
      layoutAnimationsProxy_ = std::move(layoutAnimationsProxyExperimental);
    } else {
      auto layoutAnimationsProxyLegacy = std::make_shared<LayoutAnimationsProxy_Legacy>(
          layoutAnimationsManager_,
          componentDescriptorRegistry,
          scheduler->getContextContainer(),
          getJSIRuntimeFromWorkletRuntime(uiRuntime_),
          uiScheduler_
#ifdef ANDROID
          ,
          filterUnmountedTagsFunction_,
          uiManager_,
          jsInvoker_
#endif
      );
      // TODO (future): support in experimental
      uiManager_->setAnimationDelegate(layoutAnimationsProxyLegacy.get());
      layoutAnimationsProxy_ = std::move(layoutAnimationsProxyLegacy);
    }
  }
}

#ifdef IS_REANIMATED_EXAMPLE_APP

std::string format(bool b) {
  return b ? "✅" : "❌";
}

std::function<std::string()> ReanimatedModuleProxy::createRegistriesLeakCheck() {
  return [weakThis = weak_from_this()]() {
    auto strongThis = weakThis.lock();
    if (!strongThis) {
      return std::string("");
    }

    std::string result = "";

    auto lock = strongThis->updatesRegistryManager_->lock();
    result += "AnimatedPropsRegistry: " + format(strongThis->animatedPropsRegistry_->isEmpty());
    result += "\nCSSAnimationsRegistry: " + format(strongThis->cssAnimationsRegistry_->isEmpty());
    result += "\nCSSTransitionsRegistry: " + format(strongThis->cssTransitionsRegistry_->isEmpty());
    result += "\nStaticPropsRegistry: " + format(strongThis->staticPropsRegistry_->isEmpty()) + "\n";

    return result;
  };
}

#endif // IS_REANIMATED_EXAMPLE_APP

jsi::Value ReanimatedModuleProxy::subscribeForKeyboardEvents(
    jsi::Runtime &rt,
    const jsi::Value &handlerWorklet,
    const jsi::Value &isStatusBarTranslucent,
    const jsi::Value &isNavigationBarTranslucent) {
  auto serializableHandler = extractSerializable(
      rt,
      handlerWorklet,
      "[Reanimated] Keyboard event handler must be a worklet.",
      Serializable::ValueType::WorkletType);
  return subscribeForKeyboardEventsFunction_(
      [=, weakThis = weak_from_this()](int keyboardState, int height) {
        auto strongThis = weakThis.lock();
        if (!strongThis) {
          return;
        }
        runSyncOnRuntime(strongThis->uiRuntime_, serializableHandler, jsi::Value(keyboardState), jsi::Value(height));
      },
      isStatusBarTranslucent.getBool(),
      isNavigationBarTranslucent.getBool());
}

void ReanimatedModuleProxy::unsubscribeFromKeyboardEvents(jsi::Runtime &, const jsi::Value &listenerId) {
  unsubscribeFromKeyboardEventsFunction_(listenerId.asNumber());
}

void ReanimatedModuleProxy::toggleSlowAnimationsOnUIRuntime() const {
  this->jsInvoker_->invokeAsync([](jsi::Runtime &rt) {
    const auto toggleFn = rt.global().getProperty(rt, "__toggleSlowAnimationsOnUIRuntime");
    if (!(toggleFn.isObject() && toggleFn.asObject(rt).isFunction(rt))) [[unlikely]] {
      throw std::runtime_error("[Reanimated] __toggleSlowAnimationsOnUIRuntime function missing on global.");
    }

    toggleFn.asObject(rt).asFunction(rt).call(rt);
  });
}

jsi::Object ReanimatedModuleProxy::toOptimizedObject(jsi::Runtime &rt) {
  using jsi_utils::addMethod;
  using jsi_utils::at;

  auto obj = jsi::Object(rt);

  addMethod<3>(
      rt,
      obj,
      "registerEventHandler",
      [weakThis = weak_from_this()](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[3]) {
        auto strongThis = weakThis.lock();
        if (!strongThis) {
          return jsi::Value::undefined();
        }
        return strongThis->registerEventHandler(rt, at<0>(args), at<1>(args), at<2>(args));
      });

  addMethod<1>(
      rt,
      obj,
      "unregisterEventHandler",
      [weakThis = weak_from_this()](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[1]) {
        auto strongThis = weakThis.lock();
        if (!strongThis) {
          return;
        }
        strongThis->unregisterEventHandler(rt, at<0>(args));
      });

  addMethod<3>(
      rt,
      obj,
      "getViewProp",
      [weakThis = weak_from_this()](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[3]) {
        auto strongThis = weakThis.lock();
        if (!strongThis) {
          return jsi::Value::undefined();
        }
        return strongThis->getViewProp(rt, at<0>(args), at<1>(args), at<2>(args));
      });

  addMethod<4>(
      rt,
      obj,
      "registerSensor",
      [weakThis = weak_from_this()](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[4]) {
        auto strongThis = weakThis.lock();
        if (!strongThis) {
          return jsi::Value::undefined();
        }
        return strongThis->registerSensor(rt, at<0>(args), at<1>(args), at<2>(args), at<3>(args));
      });

  addMethod<1>(
      rt,
      obj,
      "unregisterSensor",
      [weakThis = weak_from_this()](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[1]) {
        auto strongThis = weakThis.lock();
        if (!strongThis) {
          return;
        }
        strongThis->unregisterSensor(rt, at<0>(args));
      });

  addMethod<1>(
      rt,
      obj,
      "getStaticFeatureFlag",
      [weakThis = weak_from_this()](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[1]) {
        auto strongThis = weakThis.lock();
        if (!strongThis) {
          return jsi::Value::undefined();
        }
        return strongThis->getStaticFeatureFlag(rt, at<0>(args));
      });

  addMethod<2>(
      rt,
      obj,
      "setDynamicFeatureFlag",
      [weakThis = weak_from_this()](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[2]) {
        auto strongThis = weakThis.lock();
        if (!strongThis) {
          return jsi::Value::undefined();
        }
        return strongThis->setDynamicFeatureFlag(rt, at<0>(args), at<1>(args));
      });

  addMethod<3>(
      rt,
      obj,
      "subscribeForKeyboardEvents",
      [weakThis = weak_from_this()](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[3]) {
        auto strongThis = weakThis.lock();
        if (!strongThis) {
          return jsi::Value::undefined();
        }
        return strongThis->subscribeForKeyboardEvents(rt, at<0>(args), at<1>(args), at<2>(args));
      });

  addMethod<1>(
      rt,
      obj,
      "unsubscribeFromKeyboardEvents",
      [weakThis = weak_from_this()](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[1]) {
        auto strongThis = weakThis.lock();
        if (!strongThis) {
          return;
        }
        strongThis->unsubscribeFromKeyboardEvents(rt, at<0>(args));
      });

  addMethod<1>(
      rt,
      obj,
      "configureLayoutAnimationBatch",
      [weakThis = weak_from_this()](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[1]) {
        auto strongThis = weakThis.lock();
        if (!strongThis) {
          return jsi::Value::undefined();
        }
        return strongThis->configureLayoutAnimationBatch(rt, at<0>(args));
      });

  addMethod<2>(
      rt,
      obj,
      "setShouldAnimateExitingForTag",
      [weakThis = weak_from_this()](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[2]) {
        auto strongThis = weakThis.lock();
        if (!strongThis) {
          return;
        }
        strongThis->setShouldAnimateExiting(rt, at<0>(args), at<1>(args));
      });

  addMethod<2>(
      rt,
      obj,
      "setViewStyle",
      [weakThis = weak_from_this()](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[2]) {
        auto strongThis = weakThis.lock();
        if (!strongThis) {
          return;
        }
        strongThis->setViewStyle(rt, at<0>(args), at<1>(args));
      });

  addMethod<1>(
      rt,
      obj,
      "markNodeAsRemovable",
      [weakThis = weak_from_this()](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[1]) {
        auto strongThis = weakThis.lock();
        if (!strongThis) {
          return;
        }
        strongThis->markNodeAsRemovable(rt, at<0>(args));
      });

  addMethod<1>(
      rt,
      obj,
      "unmarkNodeAsRemovable",
      [weakThis = weak_from_this()](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[1]) {
        auto strongThis = weakThis.lock();
        if (!strongThis) {
          return;
        }
        strongThis->unmarkNodeAsRemovable(rt, at<0>(args));
      });

  addMethod<3>(
      rt,
      obj,
      "registerCSSKeyframes",
      [weakThis = weak_from_this()](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[3]) {
        auto strongThis = weakThis.lock();
        if (!strongThis) {
          return;
        }
        strongThis->registerCSSKeyframes(rt, at<0>(args), at<1>(args), at<2>(args));
      });

  addMethod<2>(
      rt,
      obj,
      "unregisterCSSKeyframes",
      [weakThis = weak_from_this()](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[2]) {
        auto strongThis = weakThis.lock();
        if (!strongThis) {
          return;
        }
        strongThis->unregisterCSSKeyframes(rt, at<0>(args), at<1>(args));
      });

  addMethod<3>(
      rt,
      obj,
      "applyCSSAnimations",
      [weakThis = weak_from_this()](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[3]) {
        auto strongThis = weakThis.lock();
        if (!strongThis) {
          return;
        }
        strongThis->applyCSSAnimations(rt, at<0>(args), at<1>(args), at<2>(args));
      });

  addMethod<1>(
      rt,
      obj,
      "unregisterCSSAnimations",
      [weakThis = weak_from_this()](jsi::Runtime &, const jsi::Value &, const jsi::Value(&args)[1]) {
        auto strongThis = weakThis.lock();
        if (!strongThis) {
          return;
        }
        strongThis->unregisterCSSAnimations(at<0>(args));
      });

  addMethod<2>(
      rt,
      obj,
      "runCSSTransition",
      [weakThis = weak_from_this()](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[2]) {
        auto strongThis = weakThis.lock();
        if (!strongThis) {
          return;
        }
        strongThis->runCSSTransition(rt, at<0>(args), at<1>(args));
      });

  addMethod<1>(
      rt,
      obj,
      "unregisterCSSTransition",
      [weakThis = weak_from_this()](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[1]) {
        auto strongThis = weakThis.lock();
        if (!strongThis) {
          return;
        }
        strongThis->unregisterCSSTransition(rt, at<0>(args));
      });

  addMethod<0>(rt, obj, "getSettledUpdates", [weakThis = weak_from_this()](jsi::Runtime &rt, const jsi::Value &) {
    auto strongThis = weakThis.lock();
    if (!strongThis) {
      return jsi::Value::undefined();
    }
    return strongThis->getSettledUpdates(rt);
  });

  addMethod<2>(
      rt,
      obj,
      "registerPseudoStyle",
      [weakThis = weak_from_this()](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[2]) {
        auto strongThis = weakThis.lock();
        if (!strongThis) {
          return;
        }
        strongThis->registerPseudoStyle(rt, at<0>(args), at<1>(args));
      });

  addMethod<1>(
      rt,
      obj,
      "unregisterPseudoStyle",
      [weakThis = weak_from_this()](jsi::Runtime &rt, const jsi::Value &, const jsi::Value(&args)[1]) {
        auto strongThis = weakThis.lock();
        if (!strongThis) {
          return;
        }
        strongThis->unregisterPseudoStyle(rt, at<0>(args));
      });

  return obj;
}

} // namespace reanimated
