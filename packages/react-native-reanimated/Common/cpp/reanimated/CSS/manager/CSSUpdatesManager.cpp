#include <reanimated/CSS/manager/CSSUpdatesManager.h>

namespace reanimated {

CSSUpdatesManager::CSSUpdatesManager(
    const std::shared_ptr<StaticPropsRegistry> &staticPropsRegistry,
    const std::shared_ptr<CSSKeyframesRegistry> &cssAnimationKeyframesRegistry,
    const std::shared_ptr<CSSAnimationsRegistry> &cssAnimationsRegistry,
    const std::shared_ptr<CSSTransitionsRegistry> &cssTransitionsRegistry,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : staticPropsRegistry_(staticPropsRegistry),
      cssAnimationKeyframesRegistry_(cssAnimationKeyframesRegistry),
      cssAnimationsRegistry_(cssAnimationsRegistry),
      cssTransitionsRegistry_(cssTransitionsRegistry),
      viewStylesRepository_(viewStylesRepository) {}

bool CSSUpdatesManager::commit(
    jsi::Runtime &rt,
    const jsi::Value &timestamp,
    const jsi::Value &updates) {
  const auto timestampValue = timestamp.asNumber();
  const auto &updatesArray = updates.asObject(rt).asArray(rt);
  const auto &updatesArraySize = updatesArray.size(rt);

  auto shouldRunCSSLoop = false;

  for (size_t i = 0; i < updatesArraySize; i++) {
    const auto &update = updatesArray.getValueAtIndex(rt, i);
    const auto &updateType =
        update.asObject(rt).getProperty(rt, "type").asString(rt).utf8(rt);
    const auto &payload =
        update.asObject(rt).getProperty(rt, "payload").asObject(rt);

    if (updateType == "setViewStyle") {
      shouldRunCSSLoop = setViewStyle(rt, payload);
    } else if (updateType == "removeViewStyle") {
      removeViewStyle(rt, payload);
    } else if (updateType == "registerCSSKeyframes") {
      registerCSSKeyframes(rt, payload);
    } else if (updateType == "unregisterCSSKeyframes") {
      unregisterCSSKeyframes(rt, payload);
    } else if (updateType == "applyCSSAnimations") {
      applyCSSAnimations(rt, payload, timestampValue);
      shouldRunCSSLoop = true;
    } else if (updateType == "unregisterCSSAnimations") {
      unregisterCSSAnimations(rt, payload);
    } else if (updateType == "registerCSSTransition") {
      registerCSSTransition(rt, payload);
      shouldRunCSSLoop = true;
    } else if (updateType == "updateCSSTransition") {
      updateCSSTransition(rt, payload);
      shouldRunCSSLoop = true;
    } else if (updateType == "unregisterCSSTransition") {
      unregisterCSSTransition(rt, payload);
    }
  }

  return shouldRunCSSLoop;
}

bool CSSUpdatesManager::setViewStyle(
    jsi::Runtime &rt,
    const jsi::Object &payload) {
  const auto viewTag = payload.getProperty(rt, "viewTag").asNumber();
  const auto viewStyle = payload.getProperty(rt, "viewStyle");

  staticPropsRegistry_->set(rt, viewTag, viewStyle);

  return staticPropsRegistry_->hasObservers(viewTag);
}

void CSSUpdatesManager::removeViewStyle(
    jsi::Runtime &rt,
    const jsi::Object &payload) {
  const auto viewTag = payload.getProperty(rt, "viewTag").asNumber();

  staticPropsRegistry_->remove(viewTag);
}

void CSSUpdatesManager::registerCSSKeyframes(
    jsi::Runtime &rt,
    const jsi::Object &payload) {
  const auto animationName = payload.getProperty(rt, "animationName");
  const auto keyframesConfig = payload.getProperty(rt, "keyframesConfig");

  cssAnimationKeyframesRegistry_->add(
      animationName.asString(rt).utf8(rt),
      parseCSSAnimationKeyframesConfig(
          rt, keyframesConfig, viewStylesRepository_));
}

void CSSUpdatesManager::unregisterCSSKeyframes(
    jsi::Runtime &rt,
    const jsi::Object &payload) {
  const auto animationName = payload.getProperty(rt, "animationName");

  cssAnimationKeyframesRegistry_->remove(animationName.asString(rt).utf8(rt));
}

void CSSUpdatesManager::applyCSSAnimations(
    jsi::Runtime &rt,
    const jsi::Object &payload,
    const double timestamp) {
  const auto shadowNodeWrapper = payload.getProperty(rt, "shadowNodeWrapper");
  const auto animationUpdates = payload.getProperty(rt, "animationUpdates");

  auto shadowNode = shadowNodeFromValue(rt, shadowNodeWrapper);
  const auto updates = parseCSSAnimationUpdates(rt, animationUpdates);

  CSSAnimationsMap newAnimations;

  if (!updates.newAnimationSettings.empty()) {
    // animationNames always exists when newAnimationSettings is not empty
    const auto animationNames = updates.animationNames.value();
    const auto animationNamesCount = animationNames.size();

    for (const auto &[index, settings] : updates.newAnimationSettings) {
      if (index >= animationNamesCount) {
        throw std::invalid_argument(
            "[Reanimated] index is out of bounds of animationNames");
      }

      const auto &name = animationNames[index];
      const auto animation = std::make_shared<CSSAnimation>(
          rt,
          shadowNode,
          name,
          cssAnimationKeyframesRegistry_->get(name),
          settings,
          timestamp);

      newAnimations.emplace(index, animation);
    }
  }

  cssAnimationsRegistry_->apply(
      rt,
      shadowNode,
      updates.animationNames,
      std::move(newAnimations),
      updates.settingsUpdates,
      timestamp);
}

void CSSUpdatesManager::unregisterCSSAnimations(
    jsi::Runtime &rt,
    const jsi::Object &payload) {
  const auto viewTag = payload.getProperty(rt, "viewTag").asNumber();

  cssAnimationsRegistry_->remove(viewTag);
}

void CSSUpdatesManager::registerCSSTransition(
    jsi::Runtime &rt,
    const jsi::Object &payload) {
  const auto shadowNodeWrapper = payload.getProperty(rt, "shadowNodeWrapper");
  const auto transitionConfig = payload.getProperty(rt, "transitionConfig");

  auto shadowNode = shadowNodeFromValue(rt, shadowNodeWrapper);

  auto transition = std::make_shared<CSSTransition>(
      std::move(shadowNode),
      parseCSSTransitionConfig(rt, transitionConfig),
      viewStylesRepository_);

  cssTransitionsRegistry_->add(transition);
}

void CSSUpdatesManager::updateCSSTransition(
    jsi::Runtime &rt,
    const jsi::Object &payload) {
  const auto viewTag = payload.getProperty(rt, "viewTag").asNumber();
  const auto configUpdates = payload.getProperty(rt, "configUpdates");

  cssTransitionsRegistry_->updateSettings(
      viewTag, parsePartialCSSTransitionConfig(rt, configUpdates));
}

void CSSUpdatesManager::unregisterCSSTransition(
    jsi::Runtime &rt,
    const jsi::Object &payload) {
  const auto viewTag = payload.getProperty(rt, "viewTag").asNumber();

  cssTransitionsRegistry_->remove(viewTag);
}

} // namespace reanimated
